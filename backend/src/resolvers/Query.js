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
  }
};

module.exports = Query;
