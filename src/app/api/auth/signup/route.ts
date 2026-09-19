import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { errorResponse } from '@/utils/apiWrapper';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return errorResponse('User with this email already exists', 400);
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, name },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'User registered successfully', 
        data: newUser 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.log('sign up error: ', error)
    return errorResponse('Internal Server Error', 500);
  }
}