# Flowence Server

Backend API for Flowence - All-in-one supermarket management system.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Store Management**: Multi-store support with store-specific configurations
- **User Management**: Owner and employee roles with invitation system
- **Inventory Management**: Product catalog with barcode scanning support
- **Sales Processing**: Point of sale system with payment integration
- **Security**: Comprehensive security measures including rate limiting, input validation, and XSS protection

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT with Passport.js
- **Payments**: Stripe integration
- **Email**: SendGrid
- **Security**: Helmet, CORS, Rate limiting
- **Testing**: Jest with Supertest
- **Code Quality**: ESLint, Prettier

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. Clone the repository and navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
```

4. Edit the `.env` file with your configuration:
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flowence_dev
DB_USER=flowence_user
DB_PASSWORD=flowence_password
JWT_SECRET=your-super-secret-jwt-key
```

5. Set up the database:
```bash
# Create database (run in PostgreSQL)
createdb flowence_dev

# Run migrations (will be implemented later)
npm run migrate
```

### Development

Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3001`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the project for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## API Endpoints

### Health Check
- `GET /health` - Server health status

### API Information
- `GET /api` - API information and version

### Authentication (Coming Soon)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Users (Coming Soon)
- `GET /api/users` - Get users list
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Stores (Coming Soon)
- `GET /api/stores` - Get stores list
- `POST /api/stores` - Create store
- `GET /api/stores/:id` - Get store by ID
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store

### Products (Coming Soon)
- `GET /api/products` - Get products list
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Sales (Coming Soon)
- `GET /api/sales` - Get sales list
- `POST /api/sales` - Create sale
- `GET /api/sales/:id` - Get sale by ID

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── test/            # Test files
├── app.ts           # Express app configuration
└── server.ts        # Server entry point
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable rounds
- **Rate Limiting**: Configurable request rate limits
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers
- **Input Validation**: Comprehensive input validation and sanitization
- **XSS Protection**: Cross-site scripting prevention
- **SQL Injection Prevention**: Parameterized queries

## Environment Variables

See `env.example` for all available environment variables.

### Required Variables
- `JWT_SECRET` - Secret key for JWT tokens
- `DB_HOST` - Database host
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password

### Optional Variables
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production/test)
- `CORS_ORIGIN` - CORS origin (default: http://localhost:3000)

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Contributing

1. Follow the coding standards defined in ESLint and Prettier
2. Write tests for new features
3. Update documentation as needed
4. Follow the commit message conventions

## License

MIT License - see LICENSE file for details

