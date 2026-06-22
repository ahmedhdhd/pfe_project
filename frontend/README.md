# TeslaAcademy LMS

A modern, multi-tenant Learning Management System built with Next.js, designed for educational institutions to create, manage, and deliver comprehensive online learning experiences.

## 🚀 Features

### Core Functionality
- **Multi-Tenant Architecture**: Secure data isolation with custom branding and domain support
- **Role-Based Access Control**: Separate interfaces for Admins, Teachers, and Students
- **Course Management**: Create comprehensive courses with multimedia content, chapters, topics, and downloadable resources
- **Test Series & Assessments**: Smart assessment engine with auto-grading, question banks, timed exams, and performance analytics
- **Video Integration**: Support for live classes, recorded lectures, and on-demand video content
- **Batch Management**: Organize students into batches with scheduling and enrollment tracking
- **Payment Integration**: Konnect integration for batch and test series payments
- **Exam Security**: Proctoring features and exam security measures
- **Real-Time Analytics**: Comprehensive dashboards for tracking student progress and performance

### User Roles

#### Admin
- Organization setup and configuration
- Course creation and management
- Teacher and user management
- Test series management
- System settings and analytics

#### Teacher
- Course content creation
- Student batch management
- Test creation and management
- Performance tracking

#### Student
- Course enrollment and access
- Batch participation
- Test attempts and results
- Schedule viewing
- Payment processing

## 🛠️ Tech Stack

- **Framework**: Next.js 15.5.6 (with Turbopack)
- **Language**: TypeScript
- **UI Library**: React 19.1.0
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI, shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Video Player**: Video.js with YouTube and HLS support
- **Rich Text Editor**: Tiptap
- **Animations**: Framer Motion
- **Icons**: Lucide React, Tabler Icons
- **Date Handling**: date-fns
- **HTTP Client**: Axios

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## 🔧 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd teslaacademy-lms
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with the necessary environment variables (API endpoints, authentication keys, etc.)

4. Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📜 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Remove build artifacts
- `npm run clean:all` - Remove all cache and build artifacts
- `npm run dev:clean` - Clean and start development server
- `npm run preview` - Build and preview production build

## 📁 Project Structure

```
teslaacademy-lms/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── [client]/          # Client-specific routes
│   │   ├── admin/             # Admin dashboard and pages
│   │   ├── teacher/           # Teacher dashboard and pages
│   │   └── student/           # Student pages
│   ├── components/            # React components
│   │   ├── common/           # Shared components
│   │   ├── ui/               # UI component library
│   │   ├── courses/          # Course-related components
│   │   ├── test-series/      # Test series components
│   │   └── student/          # Student-specific components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities and configurations
│   │   ├── api/             # API client setup
│   │   ├── store/           # State management
│   │   └── utils/           # Helper functions
│   └── middleware.ts        # Next.js middleware
├── public/                   # Static assets
├── docs/                     # Documentation
└── testsprite_tests/        # Test files
```

## 🔐 Authentication & Authorization

The application implements a multi-tenant authentication system with:
- Email verification
- Password setup and reset
- Role-based access control (Admin, Teacher, Student)
- Client-specific routing with subdomain support

## 🎥 Video Integration

The platform supports multiple video formats and sources:
- Video.js player with HLS streaming
- YouTube video integration
- Custom video uploads
- DRM support via videojs-contrib-eme

See `VIDEO_INTEGRATION.md`, `VIDEO_PLAYER_CONFIGURATION.md`, and `VIDEO_PLAYER_USAGE_EXAMPLES.md` for detailed documentation.

## 💳 Payment Integration

Integrated with Konnect for:
- Batch enrollment payments
- Test series purchases
- Secure payment processing

## 🧪 Testing

Test files are managed in the `testsprite_tests/` directory. The project uses Testsprite for automated testing.

## 📝 Documentation

- `VIDEO_INTEGRATION.md` - Video player integration guide
- `VIDEO_PLAYER_CONFIGURATION.md` - Video player configuration details
- `VIDEO_PLAYER_USAGE_EXAMPLES.md` - Video player usage examples
- `docs/organization-config-api.md` - Organization configuration API documentation

## 🚢 Deployment

The application is configured for deployment on Vercel with:
- Image optimization
- Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- Subdomain support for multi-tenant architecture

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and type checking
4. Submit a pull request

## 📄 License

This project is private and proprietary.

## 👥 Support

For support and inquiries, please contact the development team.

---

Built with ❤️ using Next.js and React
