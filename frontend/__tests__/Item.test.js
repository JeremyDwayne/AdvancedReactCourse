import ItemComponent from '../components/Item';
import { shallow } from 'enzyme';
import toJSON from 'enzyme-to-json';
import Item from '../components/styles/ItemStyles';

const fakeItem = {
  id: 'ABC123',
  title: 'A Cool Item',
  price: 4000,
  description: 'This item is really cool!',
  image: 'dog.jpg',
  largeImage: 'largedog.jpg',
}

describe('<Item/>', () => {
  // SNAPSHOT TESTING
  it('renders and matches the snapshot', () => {
    const wrapper = shallow(<ItemComponent item={fakeItem}/>);
    expect(toJSON(wrapper)).toMatchSnapshot();
  })
  // SHALLOW TESTING
  // it('renders image properly', () => {
  //   const wrapper = shallow(<ItemComponent item={fakeItem}/>);
  //   const img = wrapper.find('img');
  //   expect(img.props().src).toBe(fakeItem.image);
  //   expect(img.props().alt).toBe(fakeItem.title);
  // })

  // it('renders pricetag and title properly', ()=>{
  //   const wrapper = shallow(<ItemComponent item={fakeItem}/>);
  //   const PriceTag = wrapper.find('PriceTag');
  //   // awkward traversal down the rabbit hole
  //   expect(PriceTag.children().text()).toBe('$50');
  //   expect(wrapper.find('Title a').text()).toBe(fakeItem.title);
  // })

  // it('renders buttons properly', () => {
  //   const wrapper = shallow(<ItemComponent item={fakeItem}/>);
  //   const buttonList = wrapper.find('.buttonList');
  //   expect(buttonList.children()).toHaveLength(3);
  //   expect(buttonList.find('Link').exists()).toBe(true);
  //   expect(buttonList.find('AddToCart').exists()).toBe(true);
  //   expect(buttonList.find('DeleteItem').exists()).toBe(true);
  // })
})