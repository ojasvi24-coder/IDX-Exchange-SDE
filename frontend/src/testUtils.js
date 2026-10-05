import PropTypes from 'prop-types';
import { MemoryRouter } from 'react-router-dom';
import { routerFuture } from './utils/routerFuture';

// MemoryRouter pre-configured with the app's router future flags.
export default function TestRouter({ children, initialEntries = ['/'] }) {
  return <MemoryRouter initialEntries={initialEntries} future={routerFuture}>{children}</MemoryRouter>;
}

TestRouter.propTypes = {
  children: PropTypes.node.isRequired,
  initialEntries: PropTypes.arrayOf(PropTypes.string),
};
