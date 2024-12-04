# Klark

Klark is a micro SaaS platform that enables intelligent interaction with PDF documents using advanced AI capabilities. Built with modern technologies, it provides document summarization and an AI-powered chat interface for querying document content.

## Features

- 📑 PDF Document Processing
  - Document uploading and storage
  - Automatic text extraction and analysis
  - Document summarization
- 💬 Interactive Chat Interface
  - Real-time streaming responses
  - Context-aware document querying
  - Chat history analysis
  - Intelligent question generation
- 🔒 Security & Authentication

  - Secure user authentication via Lucia
  - Document access control
  - Session management

- 💳 Payment Integration
  - Stripe payment processing
  - Subscription management
  - Usage tracking

## Tech Stack

### Frontend

- Next.js with TypeScript
- Tailwind CSS for styling
- ShadCN/UI component library
- tRPC for type-safe API calls

### Backend

- LangChain.js for AI operations
- OpenAI API for language processing
- ChromaDB for vector embeddings
- PostgreSQL with Drizzle ORM
- MinIO for PDF storage
- tRPC SSE for real-time streaming

### Infrastructure

- Docker for containerization
- Traefik as reverse proxy and load balancer
- GitHub Actions for CI/CD
- Watchtower for automated deployments

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL
- MinIO
- ChromaDB
- OpenAI API key

### Environment Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/klark.git
cd klark
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env` file with the following variables:

```env
DATABASE_URL=
OPENAI_API_KEY=
MINIO_ROOT_USER=
MINIO_ROOT_PASSWORD=
MINIO_ENDPOINT=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

4. Initialize the database:

```bash
pnpm db:push
```

### Development

1. Start the development environment:

```bash
docker-compose -f docker-compose.local.yml up -d
pnpm dev
```

2. Run the setup script:

```bash
./scripts/setup.sh
```

### Production Deployment

1. Build the application:

```bash
pnpm build
```

2. Deploy using Docker Compose:

```bash
docker-compose up -d
```

## Project Structure

```
.
├── src/
│   ├── app/          # Next.js app router
│   ├── components/   # React components
│   ├── lib/          # Utility functions
│   ├── server/       # Server-side code
│   └── trpc/         # tRPC configurations
├── drizzle/          # Database migrations
├── public/           # Static assets
└── scripts/          # Utility scripts
```

## Features in Detail

### Document Processing

- Automatic text extraction from PDFs
- Document chunking and embedding generation
- Vector storage in ChromaDB for efficient retrieval

### Chat Interface

- Real-time streaming responses using tRPC SSE
- Context-aware document querying
- Intelligent follow-up question generation
- Chat history analysis for better context understanding

### Authentication & Security

- User authentication and session management with Lucia
- Secure document access control
- Role-based permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[MIT License](LICENSE)

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

Built with ❤️ using Next.js.
