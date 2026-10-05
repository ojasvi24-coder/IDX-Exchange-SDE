import '@testing-library/jest-dom';

// jsdom does not implement scrolling.
window.scrollTo = jest.fn();

// Tests must not depend on a developer's local .env (e.g. a direct API URL).
delete process.env.REACT_APP_API_URL;
