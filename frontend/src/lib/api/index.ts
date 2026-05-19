import {
  User,
  Course,
  Enrollment,
  DashboardStats,
  Activity,
  ApiResponse,
  PaginatedResponse,
} from "@/lib/types";

// Mock data
const mockUsers: User[] = [
  {
    id: "1",
    name: "John Admin",
    email: "admin@example.com",
    role: "admin",
    avatar: "/avatars/admin.jpg",
    tenantId: "tenant-1",
    createdAt: new Date("2024-01-01"),
    lastLoginAt: new Date(),
  },
  {
    id: "2",
    name: "Sarah Teacher",
    email: "teacher@example.com",
    role: "teacher",
    avatar: "/avatars/teacher.jpg",
    tenantId: "tenant-1",
    createdAt: new Date("2024-01-15"),
    lastLoginAt: new Date(),
  },
  {
    id: "3",
    name: "Mike Student",
    email: "student@example.com",
    role: "student",
    avatar: "/avatars/student.jpg",
    tenantId: "tenant-1",
    createdAt: new Date("2024-02-01"),
    lastLoginAt: new Date(),
  },
];

const mockCourses: Course[] = [
  {
    id: "1",
    title: "Introduction to React",
    description: "Learn the fundamentals of React development",
    thumbnail: "/thumbnails/react-course.jpg",
    instructorId: "2",
    instructorName: "Sarah Teacher",
    tenantId: "tenant-1",
    isPublished: true,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-25"),
    enrolledStudents: 25,
    lessons: [
      {
        id: "1",
        courseId: "1",
        title: "Getting Started with React",
        description: "Introduction to React concepts",
        content:
          "React is a JavaScript library for building user interfaces...",
        videoUrl: "https://example.com/video1",
        duration: 30,
        order: 1,
        isPublished: true,
        createdAt: new Date("2024-01-20"),
        updatedAt: new Date("2024-01-20"),
      },
      {
        id: "2",
        courseId: "1",
        title: "Components and Props",
        description: "Understanding React components",
        content: "Components are the building blocks of React applications...",
        videoUrl: "https://example.com/video2",
        duration: 45,
        order: 2,
        isPublished: true,
        createdAt: new Date("2024-01-21"),
        updatedAt: new Date("2024-01-21"),
      },
    ],
  },
  {
    id: "2",
    title: "Advanced TypeScript",
    description: "Master TypeScript for large-scale applications",
    thumbnail: "/thumbnails/typescript-course.jpg",
    instructorId: "2",
    instructorName: "Sarah Teacher",
    tenantId: "tenant-1",
    isPublished: true,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-05"),
    enrolledStudents: 18,
    lessons: [
      {
        id: "3",
        courseId: "2",
        title: "TypeScript Fundamentals",
        description: "Basic TypeScript concepts",
        content: "TypeScript adds static type checking to JavaScript...",
        videoUrl: "https://example.com/video3",
        duration: 60,
        order: 1,
        isPublished: true,
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-01"),
      },
    ],
  },
];

const mockActivities: Activity[] = [
  {
    id: "1",
    type: "enrollment",
    description: "New student enrolled in Introduction to React",
    userId: "3",
    userName: "Mike Student",
    timestamp: new Date("2024-10-20T10:30:00"),
  },
  {
    id: "2",
    type: "course_created",
    description: 'New course "Advanced TypeScript" created',
    userId: "2",
    userName: "Sarah Teacher",
    timestamp: new Date("2024-10-19T14:20:00"),
  },
  {
    id: "3",
    type: "completion",
    description: 'Student completed "Getting Started with React" lesson',
    userId: "3",
    userName: "Mike Student",
    timestamp: new Date("2024-10-18T16:45:00"),
  },
];

// Simulate API delay
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Auth API
export const authApi = {
  async login(
    email: string,
    password: string
  ): Promise<ApiResponse<{ user: User; token: string }>> {
    await delay(1000);

    const user = mockUsers.find((u) => u.email === email);
    if (!user || password !== "password") {
      return {
        data: null as never,
        success: false,
        error: "Invalid credentials",
      };
    }

    return {
      data: { user, token: "mock-jwt-token" },
      success: true,
    };
  },

  async getProfile(): Promise<ApiResponse<User>> {
    await delay(500);

    const user = mockUsers.find((u) => u.id === "1"); // Mock current user
    if (!user) {
      return {
        data: null as never,
        success: false,
        error: "User not found",
      };
    }

    return {
      data: user,
      success: true,
    };
  },

  async logout(): Promise<ApiResponse<null>> {
    await delay(300);
    return {
      data: null,
      success: true,
    };
  },
};

// Users API
export const usersApi = {
  async getUsers(
    page = 1,
    limit = 10
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    await delay(800);

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedUsers = mockUsers.slice(start, end);

    return {
      data: {
        data: paginatedUsers,
        pagination: {
          page,
          limit,
          total: mockUsers.length,
          totalPages: Math.ceil(mockUsers.length / limit),
        },
      },
      success: true,
    };
  },

  async createUser(
    userData: Omit<User, "id" | "createdAt">
  ): Promise<ApiResponse<User>> {
    await delay(1000);

    const newUser: User = {
      ...userData,
      id: (mockUsers.length + 1).toString(),
      createdAt: new Date(),
    };

    mockUsers.push(newUser);

    return {
      data: newUser,
      success: true,
    };
  },

  async updateUser(
    id: string,
    userData: Partial<User>
  ): Promise<ApiResponse<User>> {
    await delay(800);

    const userIndex = mockUsers.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return {
        data: null as never,
        success: false,
        error: "User not found",
      };
    }

    mockUsers[userIndex] = { ...mockUsers[userIndex], ...userData };

    return {
      data: mockUsers[userIndex],
      success: true,
    };
  },

  async deleteUser(id: string): Promise<ApiResponse<null>> {
    await delay(600);

    const userIndex = mockUsers.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return {
        data: null,
        success: false,
        error: "User not found",
      };
    }

    mockUsers.splice(userIndex, 1);

    return {
      data: null,
      success: true,
    };
  },
};

// Courses API
export const coursesApi = {
  async getCourses(
    page = 1,
    limit = 10
  ): Promise<ApiResponse<PaginatedResponse<Course>>> {
    await delay(800);

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedCourses = mockCourses.slice(start, end);

    return {
      data: {
        data: paginatedCourses,
        pagination: {
          page,
          limit,
          total: mockCourses.length,
          totalPages: Math.ceil(mockCourses.length / limit),
        },
      },
      success: true,
    };
  },

  async getCourse(id: string): Promise<ApiResponse<Course>> {
    await delay(500);

    const course = mockCourses.find((c) => c.id === id);
    if (!course) {
      return {
        data: null as never,
        success: false,
        error: "Course not found",
      };
    }

    return {
      data: course,
      success: true,
    };
  },

  async createCourse(
    courseData: Omit<
      Course,
      "id" | "createdAt" | "updatedAt" | "lessons" | "enrolledStudents"
    >
  ): Promise<ApiResponse<Course>> {
    await delay(1000);

    const newCourse: Course = {
      ...courseData,
      id: (mockCourses.length + 1).toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lessons: [],
      enrolledStudents: 0,
    };

    mockCourses.push(newCourse);

    return {
      data: newCourse,
      success: true,
    };
  },

  async updateCourse(
    id: string,
    courseData: Partial<Course>
  ): Promise<ApiResponse<Course>> {
    await delay(800);

    const courseIndex = mockCourses.findIndex((c) => c.id === id);
    if (courseIndex === -1) {
      return {
        data: null as never,
        success: false,
        error: "Course not found",
      };
    }

    mockCourses[courseIndex] = {
      ...mockCourses[courseIndex],
      ...courseData,
      updatedAt: new Date(),
    };

    return {
      data: mockCourses[courseIndex],
      success: true,
    };
  },

  async deleteCourse(id: string): Promise<ApiResponse<null>> {
    await delay(600);

    const courseIndex = mockCourses.findIndex((c) => c.id === id);
    if (courseIndex === -1) {
      return {
        data: null,
        success: false,
        error: "Course not found",
      };
    }

    mockCourses.splice(courseIndex, 1);

    return {
      data: null,
      success: true,
    };
  },

  async enrollInCourse(
    courseId: string,
    studentId: string
  ): Promise<ApiResponse<Enrollment>> {
    await delay(800);

    const course = mockCourses.find((c) => c.id === courseId);
    if (!course) {
      return {
        data: null as never,
        success: false,
        error: "Course not found",
      };
    }

    const enrollment: Enrollment = {
      id: `enrollment-${Date.now()}`,
      studentId,
      courseId,
      enrolledAt: new Date(),
      progress: 0,
      lastAccessedAt: new Date(),
    };

    course.enrolledStudents += 1;

    return {
      data: enrollment,
      success: true,
    };
  },
};

// Dashboard API
export const dashboardApi = {
  async getStats(): Promise<ApiResponse<DashboardStats>> {
    await delay(600);

    const stats: DashboardStats = {
      totalCourses: mockCourses.length,
      totalStudents: mockUsers.filter((u) => u.role === "student").length,
      totalTeachers: mockUsers.filter((u) => u.role === "teacher").length,
      activeEnrollments: mockCourses.reduce(
        (sum, c) => sum + c.enrolledStudents,
        0
      ),
      recentActivity: mockActivities.slice(0, 5),
    };

    return {
      data: stats,
      success: true,
    };
  },

  async getActivity(): Promise<ApiResponse<Activity[]>> {
    await delay(500);

    return {
      data: mockActivities,
      success: true,
    };
  },
};
