import { z } from 'zod';
import { NextResponse } from 'next/server';

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
  urlEnding: z.string().min(1, 'URL ending is required').regex(/^[a-zA-Z0-9-]+$/, 'URL ending can only contain letters, numbers, and hyphens')
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
  urlEnding: z.string().min(1, 'URL ending is required')
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const DeleteAccountSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
  urlEnding: z.string().min(1, 'URL ending is required')
});

export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(1, 'New password is required'),
  urlEnding: z.string().min(1, 'URL ending is required')
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const ComicDataSchema = z.object({
  url: z.string().url('Invalid URL').or(z.string().min(1, 'URL is required')),
  price: z.string().optional(),
  author: z.string().optional(),
  drawer: z.string().optional(),
  release: z.string().optional(),
  type: z.string().optional(),
  pageAmount: z.string().optional(),
  storys: z.string().optional(),
  binding: z.string().optional(),
  ISBN: z.string().optional(),
  deliverableTo: z.string().optional(),
  deliveryFrom: z.string().optional(),
  articleNumber: z.string().optional(),
  format: z.string().optional(),
  color: z.string().optional(),
  name: z.string().min(1, 'Name is required').default('Unknown Comic')
});

export type ComicData = z.infer<typeof ComicDataSchema>;

export const DependencySchema = z.object({
  urlEnding: z.string().min(1, 'URL ending is required'),
  url: z.string().min(1, 'URL is required'),
  dependencyUrl: z.string().url('Invalid dependency URL').or(z.string().min(1, 'Dependency URL is required'))
});

export type DependencyInput = z.infer<typeof DependencySchema>;

export const NoteSchema = z.object({
  urlEnding: z.string().min(1, 'URL ending is required'),
  url: z.string().min(1, 'URL is required'),
  note: z.string().max(10000, 'Note is too long (max 10000 characters)').min(1, 'Note is required')
});

export type NoteInput = z.infer<typeof NoteSchema>;

export const PrioritySchema = z.object({
  urlEnding: z.string().min(1, 'URL ending is required'),
  url: z.string().min(1, 'URL is required'),
  priority: z.number().int().min(1).max(10).default(5)
});

export type PriorityInput = z.infer<typeof PrioritySchema>;

export const NoteBodySchema = NoteSchema;
export const PriorityBodySchema = PrioritySchema;

export const ErrorResponseSchema = z.object({
  message: z.string(),
  details: z.object({
    code: z.string().optional(),
    field: z.string().optional()
  }).optional()
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const ComicUrlSchema = z.string()
  .url('Invalid comic URL')
  .transform((url) => url.replace(/\/$/, ''))
  .refine((url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('panini.de') || urlObj.hostname.includes('comicguide.de');
    } catch {
      return false;
    }
  }, 'Comic URL must be from panini.de or comicguide.de');

export const ComicUrlQuerySchema = z.object({
  url: ComicUrlSchema.optional(),
  number: z.string().regex(/^\d+$/, 'Comic number must be numeric').optional()
});

export function handleZodError(error: z.ZodError): NextResponse {
  return NextResponse.json(
    {
      message: 'Validation error',
      details: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code
      }))
    },
    { status: 400 }
  );
}