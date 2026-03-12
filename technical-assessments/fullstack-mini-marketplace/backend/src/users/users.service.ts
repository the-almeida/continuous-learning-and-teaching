import { Injectable, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "./user.entity";
import { Role } from "../common/enums/role.enum";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async create(
    email: string,
    password: string,
    role = Role.Customer,
  ): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictException("Email already registered");

    const hash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ email, password: hash, role });
    return this.userRepo.save(user);
  }
}
