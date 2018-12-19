const { forwardTo } = require('prisma-binding');
const { hasPermission } = require('../utils');

const Query = {
  // Uses prima.graphql query
  items: forwardTo('db'),
  item: forwardTo('db'),
  me(parent, args, ctx, info){
    // check if there is a current user ID
    if(!ctx.request.userId){
      return null;
    }
    return ctx.db.query.user({
      where: {id: ctx.request.userId},
    }, info);
  },
  itemsConnection: forwardTo('db'),
  async users(parent, args, ctx, info){
    // 1. Check if they're logged int
    if(!ctx.request.userId){
      throw new Error('You must be logged in!');
    }
    // 2. check if they have permissions to query all users
    hasPermission(ctx.request.user, ['ADMIN', 'PERMISSIONUPDATE']);

    // 3. if they do, query all users
    return ctx.db.query.users({}, info);
  },
  async order(parent, args, ctx, info){
    // 1. logged in
    if(!ctx.request.userId) { 
      throw new Error('Must be logged in');
    }
    // 2. query current order
    const order = await ctx.db.query.order({
      where: { id: args.id },
    }, info)
    // 3. check if they have permissions to view order
    const ownsOrder = order.user.id === ctx.request.userId;
    const hasPermissionToSeeOrder = ctx.request.user.permissions.includes('ADMIN');
    if(!ownsOrder || !hasPermissionToSeeOrder){
      throw new Error('Order doesn\'t belong to you!');
    }
    // 4. return order
    return order;
  },
  async orders(parent, args, ctx, info){
    const { userId } = ctx.request;
    if(!userId) {
      throw new Error("you must be logged in!");
    }
    return ctx.db.query.orders({
      where: {
        user: {id: userId}
      }
    }, info);
  }
};

module.exports = Query;
