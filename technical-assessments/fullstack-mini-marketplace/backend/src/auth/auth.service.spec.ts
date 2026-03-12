import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { Role } from "../common/enums/role.enum";
import * as bcrypt from "bcrypt";

const mockUser = {
  id: "uuid-1",
  email: "test@example.com",
  password: "$2b$10$hashedpassword",
  role: Role.Customer,
};

describe("AuthService", () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue("mock-token") },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
  });

  describe("register", () => {
    it("should register a new user and return token", async () => {
      usersService.create.mockResolvedValue(mockUser as any);
      const result = await service.register({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.token).toBe("mock-token");
      expect(result.user.email).toBe("test@example.com");
    });

    it("should throw if email already exists", async () => {
      usersService.create.mockRejectedValue(
        new ConflictException("Email already registered"),
      );
      await expect(
        service.register({
          email: "test@example.com",
          password: "password123",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("login", () => {
    it("should login with correct credentials", async () => {
      const hashedPw = await bcrypt.hash("password123", 10);
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        password: hashedPw,
      } as any);
      const result = await service.login({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.token).toBe("mock-token");
    });

    it("should throw UnauthorizedException for wrong password", async () => {
      const hashedPw = await bcrypt.hash("correctpassword", 10);
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        password: hashedPw,
      } as any);
      await expect(
        service.login({ email: "test@example.com", password: "wrongpassword" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for unknown email", async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({
          email: "unknown@example.com",
          password: "password123",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
