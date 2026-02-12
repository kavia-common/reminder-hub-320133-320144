import { render, screen } from '@testing-library/react';
import App from './App';

test('renders reminders header', () => {
  render(<App />);
  expect(screen.getByText(/reminders/i)).toBeInTheDocument();
});
