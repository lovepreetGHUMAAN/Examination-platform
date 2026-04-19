// PATH: app/login/page.tsx

import { Suspense } from "react"
import LoginClient from "../../components/login/LoginClient"

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginClient />
    </Suspense>
  )
}