import { mount } from 'enzyme';
import toJSON from 'enzyme-to-json';
import wait from 'waait';
import { MockedProvider } from 'react-apollo/test-utils';
import RequestReset, { REQUEST_RESET_MUTATION } from '../components/RequestReset';

const mocks = [
  {
    request: { query: REQUEST_RESET_MUTATION, variables: { email: 'jeremy@jeremydwayne.com'}, },
    result: {
      data: { requestReset: { message: 'success', __typename: 'Message'}},
    }
  }
]

describe('<RequestReset/>', () => {
  it('renders and matches snapshot', async () => {
    const wrapper = mount(
      <MockedProvider>
        <RequestReset/>
      </MockedProvider>
    );
    // await wait();
    // wrapper.update();
    const form = wrapper.find('form[data-test="form"]')
    expect(toJSON(form)).toMatchSnapshot();
  })

  it('calls the mutation', async() => {
    const wrapper = mount(
      <MockedProvider mocks={mocks}>
        <RequestReset/>
      </MockedProvider>
    );
    // simulate typing an email address
    wrapper.find('input').simulate('change', { target: { name: 'email', value: 'jeremy@jeremydwayne.com'}});
    //submit form
    wrapper.find('form').simulate('submit');
    await wait();
    wrapper.update();
    expect(wrapper.find('p').text()).toContain('Success! Check your email for a reset link!');

  })
})