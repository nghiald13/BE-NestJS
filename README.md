# MECSU Backend

RESTful APIs built with **NestJS** and **MongoDB**. This project serves as the core engine handling user authentication, product management, order processing, and payment for frontend integration.

## Getting Started

Follow these instructions to set up the MECSU Backend project locally on your machine for development and testing.

### Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended, optimized for v25+)
- [npm](https://www.npmjs.com/) (installed automatically with Node.js)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas cluster)
- [Redis Server](https://redis.io/) (Required for caching features)

### Installation & Configuration

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nghiald13/BE-NestJS.git
   cd BE-NestJS
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Duplicate the provided `.env.example` file to create your local configurations:
   ```bash
   cp .env.example .env
   ```
   Open the newly created `.env` file and populate the fields with **your actual development keys and configurations**

### Running the Application

You can control the server lifecycle using the predefined npm scripts:

* **Development Mode** (Runs with hot-reload enabled, watching for file changes):
    ```bash
    npm run start:dev
    ```
* **Debug Mode** (Runs in development with debugging capabilities):
    ```bash
    npm run start:debug
    ```
* **Production Build & Run** (Compiles TypeScript into highly optimized JavaScript code and executes it):
    ```bash
    npm run build
    npm run start:prod
    ```

Once started, the API endpoints will be accessible at: `http://localhost:<PORT>/api/v1` (Default PORT defined in `.env`).

## API Reference

### 2. Users

#### Get all users

```http
  GET /api/v1/users
```

#### Update user

```http
  PATCH /api/v1/users
```
**Required Request Body** params as below:

| Parameter | Type     | Description                     |
| :-------- | :------- | :------------------------------ |
| `_id`      | `string` | **Required**. User's ID |
| `name`      | `string` | **[Optional]**. User's Fullname |
| `email`      | `string` | **[Optional]**. User's Email |
| `password`      | `string` | **[Optional]**. User's Password |
| `phone`      | `string` | **[Optional]**. User's Phone Number |
| `address`      | `string` | **[Optional]**. User's Address |
| `image`      | `string` | **[Optional]**. User's Avatar |
| `isActive`      | `boolean` | **[Optional]**. User's Account Status |
| `role`      | `boolean` | **[Optional]**. User's Role |

#### Delete user

```http
  DELETE /api/v1/users/:_id
```
**Required Path Params** as below:

| Parameter | Type     | Description                     |
| :-------- | :------- | :------------------------------ |
| `_id`      | `string` | **Required**. User's ID |

---

### 3. Authentication

#### Sign in

```http
  POST /api/v1/auth/signin
```

**Required Request Body** params as below:

| Parameter | Type     | Description                     |
| :-------- | :------- | :------------------------------ |
| `email`      | `string` | **[Optional]**. User's Email |
| `password`      | `string` | **[Optional]**. User's Password |

#### Sign up

```http
  POST /api/v1/auth/signup
```

**Required Request Body** params as below:

| Parameter | Type     | Description                     |
| :-------- | :------- | :------------------------------ |
| `name`      | `string` | **Required**. User's Fullname |
| `email`      | `string` | **Required**. User's Email |
| `password`      | `string` | **Required**. User's Password |
| `phone`      | `string` | **[Optional]**. User's Phone Number |
| `address`      | `string` | **[Optional]**. User's Address |
| `image`      | `string` | **[Optional]**. User's Avatar |

#### Verify account

```http
  POST /api/v1/auth/verify
```

**Required Request Body** params as below:

| Parameter | Type     | Description                     |
| :-------- | :------- | :------------------------------ |
| `email`      | `string` | **Required**. User's Email |
| `codeId`      | `string` | **Required**. OTP sent to User's email |

#### Send verification email

```http
  POST /api/v1/auth/sendEmail
```

**Required Request Body** params as below:

| Parameter | Type     | Description                     |
| :-------- | :------- | :------------------------------ |
| `email`      | `string` | **Required**. User's Email |

#### Google authentication OAuth2

Google Provider will return User Info to this endpoint

```http
  POST /api/v1/auth/google
```

---

### 4. Products
#### Get all products

```http
  GET /api/v1/products
```
**[Optional]** Query Params as below:

| Parameter | Type     | Description                     |
| :-------- | :------- | :------------------------------ |
| `?kw`      | `string` | Product's name |
| `?manufacturer`      | `string` | Product's manufacturer (1 or many) |

#### Create product
Work in progress.
<!-- ```http
  POST /api/v1/products
``` -->

<!-- #### Get product manufacturers metadata

```http
  GET /api/v1/products/meta/manufacturers
``` -->

#### Get product details

```http
  GET /api/v1/products/:productId
```
**Required Path Params** as below:

| Parameter   | Type     | Description                         |
| :---------- | :------- | :---------------------------------- |
| `productId` | `string` | **Required**. Product's ID to see details |

#### Update product
Work in progress.
<!-- ```http
  PATCH /api/v1/products/${id}
```

| Parameter | Type     | Description                          |
| :-------- | :------- | :----------------------------------- |
| `id`      | `string` | **Required**. Id of product to update | -->

#### Delete product
Work in progress.
<!-- ```http
  DELETE /api/v1/products/${id}
```

| Parameter | Type     | Description                          |
| :-------- | :------- | :----------------------------------- |
| `id`      | `string` | **Required**. Id of product to delete | -->

---

### 5. Payments

#### Initialize payment

```http
  POST /api/v1/payment
```

#### Checkout payment

```http
  POST /api/v1/payment/checkout
```

---

### 6. Orders

#### Get order details (invoices)

```http
  GET /api/v1/orders/:orderId
```

| Parameter | Type     | Description                        |
| :-------- | :------- | :--------------------------------- |
| `orderId`      | `string` | **Required**. Order's ID |

---

### 7. Admin

#### Get product statistics

```http
  GET /api/v1/admin/products/stats
```