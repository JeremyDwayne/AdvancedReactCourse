import React from 'react';
import { Mutation } from 'react-apollo';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import gql from 'graphql-tag';
import { CURRENT_USER_QUERY } from './User';

const REMOVE_FROM_CART_MUTATION = gql`
  mutation removeFromCart($id: ID!) {
    removeFromCart(id: $id){
      id
    }
  }
`;

const BigButton = styled.button`
  font-size: 3rem;
  background: none;
  border: 0;
  &:hover {
    color: ${props => props.theme.red};
    cursor: pointer;
  }
`;

class RemoveFromCart extends React.Component{
  static propTypes = {
    id: PropTypes.string.isRequired,
  };
  render() {
    return (
      <Mutation refetchQueries={CURRENT_USER_MUTATION} mutation={REMOVE_FROM_CART_MUTATION} variables={{id: this.props.id}}>
        {(RemoveFromCart, {loading, error}) => (
          <BigButton title="Delete Item"
            disabled={loading}
            onClick={() => {
              RemoveFromCart().catch(err => alert(err.message));
          }}>
            &times;
          </BigButton>
        )}
      </Mutation>
    );
  }
}

export default RemoveFromCart;