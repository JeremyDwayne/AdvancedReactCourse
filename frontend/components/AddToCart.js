import React, { Component } from 'react'
import {Mutation} from 'react-apollo';
import gql from 'graphql-tag';
import { CURRENT_USER_QUERY } from './User';

const ADD_TO_CART_MUTATION = gql`
  mutation addToCart($id: ID!){
    addToCart(id: $id){
      id
      quantity
    }
  }
`;

export default class AddToCart extends Component {
  render() {
    const { id } = this.props;
    return <Mutation refetchQueries={[{query: CURRENT_USER_QUERY}]} mutation={ADD_TO_CART_MUTATION} variables={{id}}>
      {(addToCart, {loading}) => <button onClick={addToCart} disabled={loading}>Add{loading && 'ing'} To Cart 🛒</button> }
    </Mutation>
  }
}