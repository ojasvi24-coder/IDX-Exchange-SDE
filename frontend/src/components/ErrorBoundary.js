import { Component } from 'react';
import PropTypes from 'prop-types';

// Catches render-time errors in the tree below so one bad record cannot blank
// the whole app. (Event-handler and async errors are not caught by boundaries;
// those are handled where they happen.)
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    // Navigating to a different route clears the error automatically.
    const { resetKey } = this.props;
    const { error } = this.state;
    if (error && prevProps.resetKey !== resetKey) this.reset();
  }

  reset() {
    this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    const { children } = this.props;
    if (!error) return children;
    return (
      <div role="alert" className="message message--error">
        <h2>Something went wrong</h2>
        <p>An unexpected error occurred while displaying this page.</p>
        <button type="button" className="btn" onClick={this.reset}>Try again</button>
      </div>
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  resetKey: PropTypes.string,
};

ErrorBoundary.defaultProps = {
  resetKey: undefined,
};
