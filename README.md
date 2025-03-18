# RateMate-Backend

Backend API for RateMate application using Azure Functions, PostgreSQL, and Azure services.

## Prerequisites

- Node.js ≥ 20.0.0
- Azure Functions Core Tools v4.x
- PostgreSQL database (Azure Database for PostgreSQL)
- Azure CLI (for deployment)

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   Create a `local.settings.json` file with the following structure:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "POSTGRES_HOST": "your-postgres-server.postgres.database.azure.com",
       "POSTGRES_DB": "RateMate_dev_db",
       "POSTGRES_USER": "your_username",
       "POSTGRES_PASSWORD": "your_password",
       "JWT_SECRET": "your-secret-key"
     }
   }
   ```

3. **Database Setup**

   a. Create the database schema:
   ```sql
   CREATE SCHEMA IF NOT EXISTS dbo;
   ```

   b. Create the users table:
   ```sql
   CREATE TABLE dbo.users (
       user_id SERIAL PRIMARY KEY,
       username VARCHAR(50) UNIQUE NOT NULL,
       email VARCHAR(100) UNIQUE NOT NULL,
       password_hash VARCHAR(255) NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

   c. Set up required permissions:
   ```sql
   -- Grant schema usage
   GRANT USAGE ON SCHEMA dbo TO your_username;

   -- Grant table permissions
   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE dbo.users TO your_username;
   GRANT ALL PRIVILEGES ON TABLE dbo.users TO your_username;

   -- Grant sequence permissions (for SERIAL primary key)
   GRANT USAGE, SELECT ON SEQUENCE dbo.users_user_id_seq TO your_username;
   ```

4. **Build and Run**
   ```bash
   npm run build
   func start
   ```

## API Endpoints

### Authentication

#### Register User
- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Headers**: 
  - Content-Type: `application/json`
- **Body**:
  ```json
  {
      "username": "testuser",
      "email": "test@example.com",
      "password": "securepassword123"
  }
  ```
- **Success Response** (201 Created):
  ```json
  {
      "user": {
          "user_id": 1,
          "username": "testuser",
          "email": "test@example.com"
      }
  }
  ```

#### Login
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Headers**: 
  - Content-Type: `application/json`
- **Body**:
  ```json
  {
      "email": "test@example.com",
      "password": "securepassword123"
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
          "user_id": 1,
          "username": "testuser",
          "email": "test@example.com"
      }
  }
  ```
- **Error Responses**:
  - 401 Unauthorized:
    ```json
    {
        "error": "Invalid email or password"
    }
    ```

### User Profile

#### Get User Profile
- **URL**: `/api/user/profile`
- **Method**: `GET`
- **Headers**: 
  - Authorization: `Bearer {token}`
- **Success Response** (200 OK):
  ```json
  {
      "profile": {
          "user_id": 1,
          "username": "testuser",
          "email": "test@example.com",
          "created_at": "2025-02-23T17:55:28.288Z"
      }
  }
  ```
- **Error Responses**:
  - 401 Unauthorized:
    ```json
    {
        "error": "Authentication required"
    }
    ```
  - 404 Not Found:
    ```json
    {
        "error": "User not found"
    }
    ```

#### Update User Profile
- **URL**: `/api/user/profile`
- **Method**: `PUT`
- **Headers**: 
  - Content-Type: `application/json`
  - Authorization: `Bearer {token}`
- **Body**:
  ```json
  {
      "username": "newusername",
      "email": "newemail@example.com"
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
      "profile": {
          "user_id": 1,
          "username": "newusername",
          "email": "newemail@example.com",
          "created_at": "2025-02-23T17:55:28.288Z"
      }
  }
  ```
- **Error Responses**:
  - 400 Bad Request:
    ```json
    {
        "error": "No update fields provided"
    }
    ```
  - 401 Unauthorized:
    ```json
    {
        "error": "Authentication required"
    }
    ```
  - 409 Conflict:
    ```json
    {
        "error": "Email is already in use"
    }
    ```

### Brands

#### Create Brand
- **URL**: `/api/brands`
- **Method**: `POST`
- **Headers**: 
  - Content-Type: `application/json`
- **Body**:
  ```json
  {
      "brand_name": "Nike"
  }
  ```
- **Success Response** (201 Created):
  ```json
  {
      "brand_id": 1,
      "brand_name": "Nike",
      "created_at": "2025-02-23T17:55:28.288Z"
  }
  ```
- **Error Responses**:
  - 400 Bad Request:
    ```json
    {
        "error": "brand_name is required"
    }
    ```
  - 409 Conflict:
    ```json
    {
        "error": "A brand with this name already exists"
    }
    ```

#### Get All Brands
- **URL**: `/api/brands`
- **Method**: `GET`
- **Success Response** (200 OK):
  ```json
  [
      {
          "brand_id": 1,
          "brand_name": "Nike",
          "created_at": "2025-02-23T17:55:28.288Z"
      },
      {
          "brand_id": 2,
          "brand_name": "Adidas",
          "created_at": "2025-02-23T17:56:00.000Z"
      }
  ]
  ```

#### Get Brand by ID
- **URL**: `/api/brands/{id}`
- **Method**: `GET`
- **URL Parameters**: `id=[integer]`
- **Success Response** (200 OK):
  ```json
  {
      "brand_id": 1,
      "brand_name": "Nike",
      "created_at": "2025-02-23T17:55:28.288Z"
  }
  ```
- **Error Response** (404 Not Found):
  ```json
  {
      "error": "Brand with ID 1 not found"
  }
  ```

#### Update Brand
- **URL**: `/api/brands/{id}`
- **Method**: `PUT`
- **Headers**: 
  - Content-Type: `application/json`
- **URL Parameters**: `id=[integer]`
- **Body**:
  ```json
  {
      "brand_name": "Nike Sports"
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
      "brand_id": 1,
      "brand_name": "Nike Sports",
      "created_at": "2025-02-23T17:55:28.288Z"
  }
  ```
- **Error Responses**:
  - 400 Bad Request:
    ```json
    {
        "error": "brand_name is required"
    }
    ```
  - 404 Not Found:
    ```json
    {
        "error": "Brand with ID 1 not found"
    }
    ```
  - 409 Conflict:
    ```json
    {
        "error": "A brand with this name already exists"
    }
    ```

#### Delete Brand
- **URL**: `/api/brands/{id}`
- **Method**: `DELETE`
- **URL Parameters**: `id=[integer]`
- **Success Response** (200 OK):
  ```json
  {
      "message": "Brand with ID 1 successfully deleted",
      "brand": {
          "brand_id": 1,
          "brand_name": "Nike Sports",
          "created_at": "2025-02-23T17:55:28.288Z"
      }
  }
  ```
- **Error Response** (404 Not Found):
  ```json
  {
      "error": "Brand with ID 1 not found"
  }
  ```

### Database Schema

#### Users Table
```sql
CREATE TABLE dbo.users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Required Permissions
GRANT USAGE ON SCHEMA dbo TO your_username;
GRANT ALL PRIVILEGES ON TABLE dbo.users TO your_username;
GRANT USAGE, SELECT ON SEQUENCE dbo.users_user_id_seq TO your_username;
```

#### Brands Table
```sql
CREATE TABLE dbo.brands (
    brand_id SERIAL PRIMARY KEY,
    brand_name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Required Permissions
GRANT USAGE ON SCHEMA dbo TO your_username;
GRANT ALL PRIVILEGES ON TABLE dbo.brands TO your_username;
GRANT USAGE, SELECT ON SEQUENCE dbo.brands_brand_id_seq TO your_username;
```

#### Reviews Table
```sql
CREATE TABLE dbo.reviews (
    review_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES dbo.products(product_id),
    FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
);
```

#### Category Ratings Table
```sql
CREATE TABLE dbo.category_ratings (
    rating_id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL,
    category VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES dbo.reviews(review_id) ON DELETE CASCADE,
    UNIQUE (review_id, category)
);
```

#### Rating Categories Table
```sql
CREATE TABLE dbo.rating_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);
```

## Authentication Middleware

The application includes an authentication middleware that can be used to protect API endpoints. The middleware verifies JWT tokens and provides user information to the endpoint handlers.

### How to Use

1. Import the authentication middleware in your function file:
   ```typescript
   import { requireAuth } from "../utils/authMiddleware";
   ```

2. Use the middleware in your endpoint handler:
   ```typescript
   app.http('yourProtectedEndpoint', {
       methods: ['GET'],
       authLevel: 'anonymous',
       route: "your/route",
       handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
           try {
               // Authenticate the request - this will throw an error if authentication fails
               const user = await requireAuth(request, context);
               
               // user object contains:
               // - userId: the user's ID
               // - username: the user's username
               // - email: the user's email
               
               // Your endpoint logic here...
               
           } catch (error) {
               if (error instanceof Error && error.name === "UnauthorizedError") {
                   return {
                       status: 401,
                       jsonBody: { error: error.message }
                   };
               }
               
               // Other error handling...
           }
       }
   });
   ```

3. Client requests to protected endpoints must include the JWT token in the Authorization header:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Available Functions

- **requireAuth(request, context)**: Verifies the JWT token and returns the user information. Throws an UnauthorizedError if authentication fails.
- **authenticate(request, context)**: Lower-level function that verifies the JWT token and returns an AuthResult object with success status and user information.

### Authentication Flow

1. **User Registration**: Users register with a username, email, and password.
2. **User Login**: Upon successful login, the server issues a JWT token.
3. **Protected Endpoints**: The token is included in the Authorization header for requests to protected endpoints.
4. **Token Verification**: The middleware verifies the token and extracts user information.
5. **Access Control**: If verification succeeds, the endpoint handler receives the user information and processes the request.

### Implementation Details

The authentication middleware is implemented in `src/utils/authMiddleware.ts` and provides:

- Token format validation
- JWT signature verification using the secret from environment variables
- User information extraction from token payload
- Error handling for various authentication scenarios

## Testing Authentication

The project includes a test script to verify the authentication system and user profile endpoints:

### Running the Tests

```bash
node src/test/auth-test.js
```

### Test Coverage

The test script verifies:

1. **User Registration**: Creates a new user with random credentials
2. **User Login**: Authenticates the user and obtains a JWT token
3. **Unauthorized Access**: Attempts to access protected endpoints without a token (should fail)
4. **Authorized Access**: Accesses protected endpoints with a valid token (should succeed)
5. **Profile Management**: Tests retrieving and updating user profile information

### Sample Test Output

```
=== Starting API Tests ===
Base URL: http://localhost:7074/api
✅ Server is reachable

--- Testing User Registration ---
Test user: { username: 'testuser_1740816935977', email: 'testuser_1740816935977@example.com', password: 'Password123!' }
Making POST request to auth/register
Status: 201
Response: {
  "user": {
    "user_id": 4,
    "username": "testuser_1740816935977",
    "email": "testuser_1740816935977@example.com"
  }
}
✅ Registration successful

--- Testing User Login ---
Making POST request to auth/login
Status: 200
Response: {
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 4,
    "username": "testuser_1740816935977",
    "email": "testuser_1740816935977@example.com"
  }
}
✅ Login successful

--- Testing Get User Profile ---
Making GET request to user/profile (without token)
Status: 401
Response: {
  "error": "No authorization header provided"
}
✅ Unauthorized access correctly rejected

Making GET request to user/profile (with token)
Status: 200
Response: {
  "profile": {
    "user_id": 4,
    "username": "testuser_1740816935977",
    "email": "testuser_1740816935977@example.com",
    "created_at": "2025-03-01T08:32:16.000Z"
  }
}
✅ Successfully retrieved user profile

--- Testing Update User Profile ---
Making PUT request to user/profile
Status: 200
Response: {
  "profile": {
    "user_id": 4,
    "username": "updated_testuser_1740816935977",
    "email": "testuser_1740816935977@example.com",
    "created_at": "2025-03-01T08:32:16.000Z"
  }
}
✅ Successfully updated user profile

=== Tests Completed ===
```

## Development

### Project Structure
```
src/
├── functions/      # Azure Functions
├── models/         # Data models
├── services/       # Business logic
├── test/           # Test scripts
└── utils/          # Utility functions
    └── authMiddleware.ts  # Authentication middleware
```

### Available Scripts
- `npm run build` - Compile TypeScript
- `npm start` - Start Azure Functions locally
- `npm test` - Run tests

## Deployment

Instructions for deploying to Azure Functions will be added soon.

## Security Notes

- Passwords are hashed using bcrypt before storage
- JWT is used for authentication with secure token validation
- Protected endpoints require valid authentication tokens
- Token expiration is enforced for enhanced security
- Authorization headers are validated for proper format
- Database permissions are strictly controlled
- Environment variables are used for sensitive configuration
- JWT secret is stored securely and not exposed in code

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

[Add your license information here]

### Reviews

#### Get Reviews for a Product
- **URL**: `/api/reviews?productId={productId}`
- **Method**: `GET`
- **Success Response** (200 OK):
  ```json
  [
    {
      "review_id": 1,
      "product_id": 1,
      "user_id": 2,
      "username": "testuser",
      "title": "Great product",
      "content": "This is an excellent product, highly recommended!",
      "rating": 8,
      "created_at": "2023-06-15T10:30:00.000Z",
      "updated_at": "2023-06-15T10:30:00.000Z",
      "comments_count": 3,
      "category_ratings": [
        {
          "rating_id": 1,
          "review_id": 1,
          "category": "value_for_money",
          "score": 8,
          "created_at": "2023-06-15T10:30:00.000Z"
        },
        // ... other category ratings
      ],
      "average_category_rating": 8.4
    }
  ]
  ```
- **Error Responses**:
  - 400 Bad Request:
    ```json
    {
      "error": "Invalid product ID"
    }
    ```

#### Get a Specific Review
- **URL**: `/api/reviews/{reviewId}`
- **Method**: `GET`
- **Success Response** (200 OK):
  ```json
  {
    "review_id": 1,
    "product_id": 1,
    "user_id": 2,
    "username": "testuser",
    "title": "Great product",
    "content": "This is an excellent product, highly recommended!",
    "rating": 8,
    "created_at": "2023-06-15T10:30:00.000Z",
    "updated_at": "2023-06-15T10:30:00.000Z",
    "comments_count": 3,
    "category_ratings": [
      {
        "rating_id": 1,
        "review_id": 1,
        "category": "value_for_money",
        "score": 8,
        "created_at": "2023-06-15T10:30:00.000Z"
      },
      // ... other category ratings
    ],
    "average_category_rating": 8.4
  }
  ```
- **Error Responses**:
  - 400 Bad Request:
    ```json
    {
      "error": "Invalid review ID"
    }
    ```
  - 404 Not Found:
    ```json
    {
      "error": "Review with ID 1 not found"
    }
    ```

#### Create a Review
- **URL**: `/api/reviews`
- **Method**: `POST`
- **Headers**: 
  - Content-Type: `application/json`
  - Authorization: `Bearer {token}`
- **Body**:
  ```json
  {
    "product_id": 1,
    "title": "Great product",
    "content": "This is an excellent product, highly recommended!",
    "rating": 8,
    "category_ratings": {
      "value_for_money": 7,
      "build_quality": 9,
      "functionality": 8,
      "durability": 8,
      "ease_of_use": 6,
      "aesthetics": 9,
      "compatibility": 7
    }
  }
  ```
- **Success Response** (201 Created):
  ```json
  {
    "review_id": 1,
    "product_id": 1,
    "user_id": 2,
    "title": "Great product",
    "content": "This is an excellent product, highly recommended!",
    "rating": 8,
    "created_at": "2023-06-15T10:30:00.000Z",
    "updated_at": "2023-06-15T10:30:00.000Z",
    "category_ratings": [
      {
        "rating_id": 1,
        "review_id": 1,
        "category": "value_for_money",
        "score": 7,
        "created_at": "2023-06-15T10:30:00.000Z"
      },
      {
        "rating_id": 2,
        "review_id": 1,
        "category": "build_quality",
        "score": 9,
        "created_at": "2023-06-15T10:30:00.000Z"
      },
      // ... other category ratings
    ]
  }
  ```
- **Error Responses**:
  - 400 Bad Request:
    ```json
    {
      "error": "Missing required fields: product_id, title, content, rating"
    }
    ```
  - 400 Bad Request:
    ```json
    {
      "error": "Rating must be between 1 and 10"
    }
    ```
  - 400 Bad Request:
    ```json
    {
      "error": "value_for_money rating must be between 1 and 10"
    }
    ```
  - 401 Unauthorized:
    ```json
    {
      "error": "Authentication required"
    }
    ```
  - 404 Not Found:
    ```json
    {
      "error": "Product with ID 1 not found"
    }
    ```
  - 409 Conflict:
    ```json
    {
      "error": "You have already reviewed this product"
    }
    ```

#### Update a Review
- **URL**: `/api/reviews/{reviewId}`
- **Method**: `PUT`
- **Headers**: 
  - Content-Type: `application/json`
  - Authorization: `Bearer {token}`
- **Body**:
  ```json
  {
    "title": "Updated title",
    "content": "Updated content",
    "rating": 9,
    "category_ratings": {
      "value_for_money": 8,
      "build_quality": 9,
      "functionality": 9
    }
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "review_id": 1,
    "product_id": 1,
    "user_id": 2,
    "title": "Updated title",
    "content": "Updated content",
    "rating": 9,
    "created_at": "2023-06-15T10:30:00.000Z",
    "updated_at": "2023-06-15T11:45:00.000Z",
    "category_ratings": [
      {
        "rating_id": 1,
        "review_id": 1,
        "category": "value_for_money",
        "score": 8,
        "created_at": "2023-06-15T10:30:00.000Z"
      },
      {
        "rating_id": 2,
        "review_id": 1,
        "category": "build_quality",
        "score": 9,
        "created_at": "2023-06-15T10:30:00.000Z"
      },
      // ... other category ratings
    ],
    "average_category_rating": 8.4
  }
  ```
- **Error Responses**:
  - 400 Bad Request:
    ```json
    {
      "error": "No update fields provided"
    }
    ```
  - 401 Unauthorized:
    ```json
    {
      "error": "Authentication required"
    }
    ```
  - 404 Not Found:
    ```json
    {
      "error": "Review with ID 1 not found or you don't have permission to update it"
    }
    ```

#### Delete a Review
- **URL**: `/api/reviews/{reviewId}`
- **Method**: `DELETE`
- **Headers**: 
  - Authorization: `Bearer {token}`
- **Success Response** (200 OK):
  ```json
  {
    "message": "Review with ID 1 successfully deleted",
    "review": {
      "review_id": 1,
      "product_id": 1,
      "user_id": 2,
      "title": "Updated title",
      "content": "Updated content",
      "rating": 9,
      "created_at": "2023-06-15T10:30:00.000Z",
      "updated_at": "2023-06-15T11:45:00.000Z",
      "category_ratings": [
        {
          "rating_id": 1,
          "review_id": 1,
          "category": "value_for_money",
          "score": 8,
          "created_at": "2023-06-15T10:30:00.000Z"
        },
        // ... other category ratings
      ],
      "average_category_rating": 8.4
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request:
    ```json
    {
      "error": "Invalid review ID"
    }
    ```
  - 401 Unauthorized:
    ```json
    {
      "error": "Authentication required"
    }
    ```
  - 404 Not Found:
    ```json
    {
      "error": "Review with ID 1 not found or you don't have permission to delete it"
    }
    ```

#### Get Rating Categories
- **URL**: `/api/reviews?categoriesOnly=true`
- **Method**: `GET`
- **Success Response** (200 OK):
  ```json
  [
    {
      "category_id": 1,
      "category_name": "value_for_money",
      "description": "Rating for the value received relative to the price paid",
      "is_active": true
    },
    {
      "category_id": 2,
      "category_name": "build_quality",
      "description": "Rating for the quality of materials and construction",
      "is_active": true
    },
    // ... other categories
  ]
  ```

### Comments

#### Get Comments for a Review
- **URL**: `/api/comments?reviewId={reviewId}`
- **Method**: `GET`
- **Success Response** (200 OK):
  ```json
  [
    {
      "comment_id": 1,
      "review_id": 1,
      "user_id": 3,
      "username": "commenter",
      "parent_comment_id": null,
      "content": "I agree with this review!",
      "created_at": "2023-06-15T12:30:00.000Z",
      "updated_at": "2023-06-15T12:30:00.000Z",
      "replies_count": 2
    }
  ]
  ```
- **Error Responses**:
  - 400 Bad Request:
    ```json
    {
      "error": "Invalid review ID"
    }
    ```

#### Get Replies to a Comment
- **URL**: `/api/comments?parentId={commentId}`
- **Method**: `GET`
- **Success Response** (200 OK):
  ```json
  [
    {
      "comment_id": 2,
      "review_id": 1,
      "user_id": 4,
      "username": "replier",
      "parent_comment_id": 1,
      "content": "Thanks for your comment!",
      "created_at": "2023-06-15T13:00:00.000Z",
      "updated_at": "2023-06-15T13:00:00.000Z"
    }
  ]
  ```
- **Error Responses**:
  - 400 Bad Request:
    ```json
    {
      "error": "Invalid parent comment ID"
    }
    ```

#### Get a Specific Comment
- **URL**: `/api/comments/{commentId}`
- **Method**: `GET`
- **Success Response** (200 OK):
  ```json
  {
    "comment_id": 1,
    "review_id": 1,
    "user_id": 3,
    "username": "commenter",
    "parent_comment_id": null,
    "content": "I agree with this review!",
    "created_at": "2023-06-15T12:30:00.000Z",
    "updated_at": "2023-06-15T12:30:00.000Z"
  }
  ```
- **Error Responses**:
  - 400 Bad Request:
    ```json
    {
      "error": "Invalid comment ID"
    }
    ```
  - 404 Not Found:
    ```json
    {
      "error": "Comment with ID 1 not found"
    }
    ```

#### Create a Comment
- **URL**: `/api/comments`
- **Method**: `POST`
- **Headers**: 
  - Content-Type: `application/json`
  - Authorization: `Bearer {token}`
- **Body**:
  ```json
  {
    "review_id": 1,
    "content": "I agree with this review!",
    "parent_comment_id": null
  }
  ```
- **Success Response** (201 Created):
  ```json
  {
    "comment_id": 1,
    "review_id": 1,
    "user_id": 3,
    "parent_comment_id": null,
    "content": "I agree with this review!",
    "created_at": "2023-06-15T12:30:00.000Z",
    "updated_at": "2023-06-15T12:30:00.000Z"
  }
  ```
- **Error Responses**:
  - 400 Bad Request:
    ```json
    {
      "error": "Missing required fields: review_id, content"
    }
    ```
  - 401 Unauthorized:
    ```json
    {
      "error": "Authentication required"
    }
    ```
  - 404 Not Found:
    ```json
    {
      "error": "Review with ID 1 not found"
    }
    ```

#### Update a Comment
- **URL**: `/api/comments/{commentId}`
- **Method**: `PUT`
- **Headers**: 
  - Content-Type: `application/json`
  - Authorization: `Bearer {token}`
- **Body**:
  ```json
  {
    "content": "Updated comment content"
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "comment_id": 1,
    "review_id": 1,
    "user_id": 3,
    "parent_comment_id": null,
    "content": "Updated comment content",
    "created_at": "2023-06-15T12:30:00.000Z",
    "updated_at": "2023-06-15T14:00:00.000Z"
  }
  ```
- **Error Responses**:
  - 400 Bad Request:
    ```json
    {
      "error": "Content is required for update"
    }
    ```
  - 401 Unauthorized:
    ```json
    {
      "error": "Authentication required"
    }
    ```
  - 404 Not Found:
    ```json
    {
      "error": "Comment with ID 1 not found or you don't have permission to update it"
    }
    ```

#### Delete a Comment
- **URL**: `/api/comments/{commentId}`
- **Method**: `DELETE`
- **Headers**: 
  - Authorization: `Bearer {token}`
- **Success Response** (200 OK):
  ```json
  {
    "message": "Comment with ID 1 successfully deleted",
    "comment": {
      "comment_id": 1,
      "review_id": 1,
      "user_id": 3,
      "parent_comment_id": null,
      "content": "Updated comment content",
      "created_at": "2023-06-15T12:30:00.000Z",
      "updated_at": "2023-06-15T14:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - 400 Bad Request:
    ```json
    {
      "error": "Invalid comment ID"
    }
    ```
  - 401 Unauthorized:
    ```json
    {
      "error": "Authentication required"
    }
    ```
  - 404 Not Found:
    ```json
    {
      "error": "Comment with ID 1 not found or you don't have permission to delete it"
    }
    ```
