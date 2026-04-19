// PATH: app/reset-password/page.tsx

import { Suspense } from "react"
import ResetPasswordClient from "../../components/reset-password/ResetPasswordClient"

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordClient />
    </Suspense>
  )
}