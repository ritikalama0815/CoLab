import { redirect } from 'next/navigation'
import { SignUpForm, type SignUpRole } from './sign-up-form'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const { role } = await searchParams
  const normalized: SignUpRole | null =
    role === 'student' || role === 'instructor' ? role : null
  if (!normalized) {
    redirect('/auth/get-started')
  }
  return <SignUpForm role={normalized} />
}
