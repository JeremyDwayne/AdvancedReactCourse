const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const { transport, makeANiceEmail } = require('../mail');
const { hasPermission } = require('../utils');
const stripe = require('../stripe');

const Mutations = {
  async createItem(parent, args, ctx, info) {
    if(!ctx.request.userId) {
      throw new Error('You must be logged in to do that');
    }

    const item = await ctx.db.mutation.createItem({
      data: {
        // this is how we create a relationship between an item and the user
        user: {
          connect: {
            id: ctx.request.userId,
          }
        },
        ...args
      }
    }, info);

    return item;
  },
  updateItem(parent, args, ctx, info){
    // copy of updates
    const updates = { ...args };
    // remove id from updates
    delete updates.id;
    // run update
    return ctx.db.mutation.updateItem({
      data: updates,
      where: {
        id: args.id
      }
    }, 
      info
    );
  },
  async deleteItem(parent, args, ctx, info){
    const where = { id: args.id };
    //1. find item
    const item = await ctx.db.query.item({where}, `{ id title user { id }}`);
    //2. check if user owns item (permissions)
    const ownsItem = item.user.id === ctx.request.userId;
    const hasPermissions = ctx.request.user.permissions.some
    (permission => 
      ['ADMIN', 'ITEMDELETE'].includes(permission)
    );

    if(!ownsItem || !hasPermissions){
      throw new Error('You don\'t have permission to do that!')
    }
    //3. delete item
    return ctx.db.mutation.deleteItem({where}, info);
  },
  async signup(parent, args, ctx, info){
    args.email = args.email.toLowerCase();
    // hash password
    const password = await bcrypt.hash(args.password, 10);
    // create user in db
    const user = await ctx.db.mutation.createUser({
      data: {
        ...args,
        password,
        permissions: { set: ['USER'] }
      }
    }, info);
    // create JWT token for them to be logged in
    const token = jwt.sign({userId: user.id}, process.env.APP_SECRET);
    // set jwt as cookie on response
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
    });
    // return user to browser
    return user;
  },
  async signin(parent, {email, password}, ctx, info){
    // 1. check if user with email
    const user = await ctx.db.query.user({where: {email}});
    if(!user) {
      throw new Error(`No such user found for email ${email}`);
    }
    // 2. check if password is correct
    const valid = await bcrypt.compare(password, user.password);
    if (!valid){
      throw new Error('Invalid password!');
    }
    // 3. generate jwt token
    const token = jwt.sign({userId: user.id}, process.env.APP_SECRET);
    // 4. set cookie with token
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
    });
    // 5. return user
    return user;
  },
  signout(parent, args, ctx, info) {
    ctx.response.clearCookie('token');
    return { message: 'Goodbye!'};
  },
  async requestReset(parent, args, ctx, info) {
    // 1. check if is a real user
    const user = await ctx.db.query.user({where: { email: args.email}});
    if (!user){
      throw new Error(`No such user found for email ${args.email}`);
    }
    // 2. set reset token and expiry on that user
    const resetToken = (await promisify(randomBytes)(20)).toString('hex');
    const resetTokenExpiry = Date.now() +  3600000;
    const res = await ctx.db.mutation.updateUser({
      where: { email: args.email },
      data: { resetToken, resetTokenExpiry }
    })
    // console.log(res);
    // 3. email reset token
    const mailRes = await transport.sendMail({
      from: 'jeremy@jeremydwayne.com',
      to: user.email,
      subject: 'Password Reset Token',
      html: makeANiceEmail(`Your Password Reset Token is here! 
      \n\n 
      <a href="${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}">Click Here to Reset</a>`)
    })
    // 4. return message
    return {message: "Thanks"};
  },
  async resetPassword(parent, args, ctx, info){
    // 1. check if the passwords match
    if(args.password !== args.confirmPassword){
      throw new Error("Your passwords don't match");
    }
    // 2. check if its a legit reset token and not expired
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000
      }
    });
    if (!user) {
      throw new Error('This token is either invalid or expired!');
    }

    // 3. hash new password
    const password = await bcrypt.hash(args.password, 10);
    // 4. save new pass to user and remove old resetToken fields
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email: user.email },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null,
      }
    })
    // 5. generate JWT
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
    // 6. set JWT cookies
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });
    // 7. return the new user
    return updatedUser;
  },
  async updatePermissions(parent, args, ctx, info){
    // 1. check if logged in
    if(!ctx.request.userId){
      throw new Error('You must be logged in!');
    }
    // 2. query current user
    const currentUser = await ctx.db.query.user({
      where: {
        id: ctx.request.userId,
      },
    }, info);
    // 3. check if they have permissions to do it
    hasPermission(currentUser, ['ADMIN', 'PERMISSIONUPDATE']);
    // 4. update permissions
    return ctx.db.mutation.updateUser({
      data: {
        permissions: {
          set: args.permissions,
        },
      },
      where: {
        id: args.userId,
      },
    }, info)
  },
  async addToCart(parent, args, ctx, info){
    // 1. Check if user is signed in
    const {userId} = ctx.request;
    if (!userId){
      throw new Error('You must be signed in!');
    }
    // 2. Query the users current cart
    const [existingCartItem] = await ctx.db.query.cartItems({
      where: {
        user: { id: userId},
        item: { id: args.id},
      }
    });
    // 3. Check if item is in cart already, increment by 1 if is
    if(existingCartItem) {
      console.log("item already in cart")
      return ctx.db.mutation.updateCartItem({
        where: { id: existingCartItem.id },
        data: { quantity: existingCartItem.quantity + 1 },
      }, info);
    }
    // 4. If not create a new CartItem
    return ctx.db.mutation.createCartItem({
      data: {
        user: {
          connect: { id: userId },
        },
        item: {
          connect: { id: args.id },
        }
      }
    }, info);
  },
  async removeFromCart(parent, args, ctx, info){
    // 1. find the cart item
    const cartItem = await ctx.db.query.cartItem({
      where: {
        id: args.id,
      },
    }, `{id, user { id }}`);
    // 1.5. Make sure you found the item
    if(!cartItem) {
      throw new Error('No cart item found!');
    }
    // 2. do they own the item
    if(cartItem.user.id !== ctx.request.userId) {
      throw new Error('This is not your cart item');
    }
    // 3. delete cart item
    return ctx.db.mutation.deleteCartItem({
      where: {id: args.id},
    }, info);
  },
  async createOrder(parent, args, ctx, info){
    // 1. query current user and verify signed in
    const { userId } = ctx.request;
    if(!userId) {
      throw new Error("You must be signed in to complete this order");
    }
    const user = await ctx.db.query.user({where: {id: userId }}, 
      `{ id name email cart { id quantity item { title, price, id, description, image, largeImage }}}`
    );

    // 2. recalculate total for the price to prevent people from changing total in js
    const amount = user.cart.reduce((tally, cartItem) => tally + cartItem.item.price * cartItem.quantity, 0);
    console.log(`charging ${amount}`);

    // 3. create stripe charge
    const charge = await stripe.charges.create({
      amount,
      currency: 'USD',
      source: args.token,
    });

    // 4. convert cart items to order items
    const orderItems = user.cart.map(cartItem => {
      const orderItem = {
        ...cartItem.item,
        quantity: cartItem.quantity,
        user: {connect: {id: userId}},
      };
      delete orderItem.id;
      return orderItem;
    });

    // 5. create order
    const order = await ctx.db.mutation.createOrder({
      data: {
        total: charge.amount,
        charge: charge.id,
        items: { create: orderItems },
        user: { connect: { id: userId }},
      }
    });

    // 6. clear cart, delete cart items from db
    const cartItemIds = user.cart.map(cartItem => cartItem.id);
    await ctx.db.mutation.deleteManyCartItems({
      where: {
        id_in: cartItemIds,
      }
    });

    // 7. return order to client
    return order;
  },
};

module.exports = Mutations;