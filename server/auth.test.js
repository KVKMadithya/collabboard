const jwt = require('jsonwebtoken');

// A mock version of your generateToken function for testing purposes
const generateToken = (id) => {
  return jwt.sign({ id }, 'dummy_secret', { expiresIn: '30d' });
};

describe('Authentication Unit Tests', () => {
  it('should generate a valid JWT token string', () => {
    const token = generateToken('123456');
    
    // Assertions
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); 
  });
});