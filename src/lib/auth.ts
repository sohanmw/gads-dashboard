import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase';
import crypto from 'crypto';

export type UserRole = 'super_admin' | 'strategist' | 'team_lead' | 'project_manager';
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface User {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    created_at: string;
    updated_at: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 * Minimum 8 characters, at least one letter and one number
 */
export function isValidPassword(password: string): boolean {
    if (password.length < 8) return false;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return hasLetter && hasNumber;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, email, role, status, created_at, updated_at')
        .eq('email', email.toLowerCase())
        .single();

    if (error || !data) return null;
    return data as User;
}

/**
 * Verify user credentials
 */
export async function verifyCredentials(email: string, password: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

    if (error || !data) return null;

    const isValid = await verifyPassword(password, data.password_hash);
    if (!isValid) return null;

    // Check if user is active
    if (data.status !== 'active') return null;

    return {
        id: data.id,
        email: data.email,
        role: data.role,
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at,
    };
}

/**
 * Generate a secure random token
 */
export function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Create password reset token
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    const { error } = await supabaseAdmin
        .from('password_reset_tokens')
        .insert({
            user_id: userId,
            token,
            expires_at: expiresAt.toISOString(),
        });

    if (error) throw new Error('Failed to create reset token');
    return token;
}

/**
 * Verify password reset token
 */
export async function verifyResetToken(token: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
        .from('password_reset_tokens')
        .select('user_id, expires_at, used')
        .eq('token', token)
        .single();

    if (error || !data) return null;
    if (data.used) return null;
    if (new Date(data.expires_at) < new Date()) return null;

    return data.user_id;
}

/**
 * Mark reset token as used
 */
export async function markTokenAsUsed(token: string): Promise<void> {
    await supabaseAdmin
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', token);
}

/**
 * Update user password
 */
export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    const passwordHash = await hashPassword(newPassword);

    const { error } = await supabaseAdmin
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', userId);

    return !error;
}
