import React, { Component } from 'react'
import Downshift, {resetIdCounter} from 'downshift';
import Router from 'next/router';
import { ApolloConsumer } from 'react-apollo';
import gql from 'graphql-tag';
import debounce from 'lodash.debounce';
import { DropDown, DropDownItem, SearchStyles } from './styles/DropDown';

const SEARCH_ITEMS_QUERY = gql`
  query SEARCH_ITEMS_QUERY($searchTerm: String!){
    items(where: {
      OR: [
        { title_contains: $searchTerm },
        { description_contains: $searchTerm},
      ]
    }){
      id
      image
      title
    }
  }
`;

function routeToItem(item) {
  Router.push({
    pathname: '/item',
    query: {
      id: item.id,
    },
  });
}

class Search extends Component {
  state = {
    items: [],
    loading: false,
  }
  // Debounce delays the query from running so it only checks every 350 ms
  onChange = debounce(async (e, client) => {
    console.log('searching...');
    // turn loading on
    this.setState({ loading: true });
    // Manually query apollo client
    const res = await client.query({
      query: SEARCH_ITEMS_QUERY,
      variables: { searchTerm: e.target.value },
    })
    // set items to state and set loading to false
    this.setState({ items: res.data.items, loading: false });
  }, 350);
  render() {
    resetIdCounter();
    return (
      <SearchStyles>
        {/* Downshift from paypal */}
        <Downshift onChange={routeToItem} itemToString={item => (item === null ? '' : item.title)}>
          {({ getInputProps, getItemProps, isOpen, inputValue, highlightedIndex }) => (
            <div>
              <ApolloConsumer>
                {(client) => (
                  <input type="search" 
                    {...getInputProps({
                      type: 'search',
                      placeholder: "Search For An Item",
                      id: "search",
                      className: this.state.loading ? 'loading' : '',
                      onChange: (e) => {
                        e.persist();
                        this.onChange(e, client);
                      },
                    })}
                  />
                )}
              </ApolloConsumer>
              {isOpen && (
                <DropDown>
                  {this.state.items.map((item, index) => (
                    <DropDownItem 
                      {...getItemProps({ item })}
                      key={item.id}
                      highlighted={index === highlightedIndex}
                    >
                      <img width="50" src={item.image} alt={item.titls} />
                      {item.title}
                    </DropDownItem>
                  )
                  )}
                  {!this.state.items.length && !this.state.loading && (
                    <DropDownItem>Nothing Found For {inputValue}</DropDownItem>
                  )}
                </DropDown>
              )}
            </div>
          )}
        </Downshift>
      </SearchStyles>
    );
  }
}
export default Search;