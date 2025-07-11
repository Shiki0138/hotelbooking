import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'LastMinuteStay API',
    version: '1.0.0',
    description: 'High-performance hotel booking API with real-time availability tracking'
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Hotel: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          country: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          rating: { type: 'number' },
          amenities: { type: 'array', items: { type: 'string' } },
          images: { type: 'array', items: { type: 'string' } }
        }
      },
      Room: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          hotelId: { type: 'string' },
          type: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          capacity: { type: 'integer' },
          basePrice: { type: 'number' },
          amenities: { type: 'array', items: { type: 'string' } },
          images: { type: 'array', items: { type: 'string' } }
        }
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          roomId: { type: 'string' },
          checkIn: { type: 'string', format: 'date' },
          checkOut: { type: 'string', format: 'date' },
          guests: { type: 'integer' },
          totalPrice: { type: 'number' },
          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] },
          paymentStatus: { type: 'string', enum: ['PENDING', 'PAID', 'REFUNDED'] }
        }
      }
    }
  },
  paths: {
    '/hotels/search': {
      get: {
        tags: ['Hotels'],
        summary: 'Search hotels with filters',
        parameters: [
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'country', in: 'query', schema: { type: 'string' } },
          { name: 'checkIn', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'checkOut', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'guests', in: 'query', required: true, schema: { type: 'integer' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
          { name: 'rating', in: 'query', schema: { type: 'number' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['price', 'rating', 'distance'] } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } }
        ],
        responses: {
          200: {
            description: 'Hotel search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Hotel' } },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        totalPages: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/hotels/{id}': {
      get: {
        tags: ['Hotels'],
        summary: 'Get hotel by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: {
            description: 'Hotel details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Hotel' }
              }
            }
          }
        }
      }
    },
    '/rooms/search': {
      get: {
        tags: ['Rooms'],
        summary: 'Search available rooms',
        parameters: [
          { name: 'hotelId', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'checkIn', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'checkOut', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'guests', in: 'query', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          200: {
            description: 'Available rooms',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Room' }
                }
              }
            }
          }
        }
      }
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new user',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string' },
                  phone: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'User registered successfully'
          }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login user',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful'
          }
        }
      }
    },
    '/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Create new booking',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['roomId', 'checkIn', 'checkOut', 'guests'],
                properties: {
                  roomId: { type: 'string' },
                  checkIn: { type: 'string', format: 'date' },
                  checkOut: { type: 'string', format: 'date' },
                  guests: { type: 'integer' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Booking created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Booking' }
              }
            }
          }
        }
      },
      get: {
        tags: ['Bookings'],
        summary: 'Get user bookings',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User bookings',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Booking' }
                }
              }
            }
          }
        }
      }
    }
  }
};

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};