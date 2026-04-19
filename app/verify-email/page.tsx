// PATH: app/verify-email/page.tsx

import { Suspense } from "react"
import VerifyEmailClient from "../../components/verify-email/VerifyEmailClient"

export default function Page() {
  return (
    <Suspense fallback={<div>Verifying...</div>}>
      <VerifyEmailClient />
    </Suspense>
  )
}