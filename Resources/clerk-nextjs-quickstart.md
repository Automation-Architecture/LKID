[Skip to main content](https://clerk.com/docs/nextjs/getting-started/quickstart#main)

# Next.js Quickstart (App Router)

1. [Create a new Next.js app](https://clerk.com/docs/nextjs/getting-started/quickstart#create-a-new-next-js-app)
2. [Install `@clerk/nextjs`](https://clerk.com/docs/nextjs/getting-started/quickstart#install-clerk-nextjs)
3. [Set your Clerk API keys](https://clerk.com/docs/nextjs/getting-started/quickstart#set-your-clerk-api-keys)
4. [Add `clerkMiddleware()` to your app](https://clerk.com/docs/nextjs/getting-started/quickstart#add-clerk-middleware-to-your-app)
5. [Add `<ClerkProvider>` and Clerk components to your app](https://clerk.com/docs/nextjs/getting-started/quickstart#add-clerk-provider-and-clerk-components-to-your-app)
6. [Run your project](https://clerk.com/docs/nextjs/getting-started/quickstart#run-your-project)
7. [Create your first user](https://clerk.com/docs/nextjs/getting-started/quickstart#create-your-first-user)
8. [Next steps](https://clerk.com/docs/nextjs/getting-started/quickstart#next-steps)

Available in other SDKs

[![](<Base64-Image-Removed>)](https://clerk.com/docs/tanstack-react-start/getting-started/quickstart)

Use this pre-built prompt to get started faster.

Open in CursorOpen in Cursor

Open in CursorOpen in Cursor

Copy promptCopy prompt

Copy promptCopy prompt

## Example repository

- [Next.js App Router Quickstart Repo](https://github.com/clerk/clerk-nextjs-app-quickstart)

## [Create a new Next.js app](https://clerk.com/docs/nextjs/getting-started/quickstart\#create-a-new-next-js-app)

If you don't already have a Next.js app, run the following commands to [create a new one⁠](https://nextjs.org/docs/getting-started/installation).

npm

pnpm

yarn

bun

terminal

```
npm create next-app@latest clerk-nextjs -- --yes
cd clerk-nextjs
npm install
```

## [Install `@clerk/nextjs`](https://clerk.com/docs/nextjs/getting-started/quickstart\#install-clerk-nextjs)

The [Clerk Next.js SDK](https://clerk.com/docs/reference/nextjs/overview) gives you access to prebuilt components, hooks, and helpers to make user authentication easier.

Run the following command to install the SDK:

npm

pnpm

yarn

bun

terminal

```
npm install @clerk/nextjs
```

## [Add `clerkMiddleware()` to your app](https://clerk.com/docs/nextjs/getting-started/quickstart\#add-clerk-middleware-to-your-app)

[clerkMiddleware()](https://clerk.com/docs/reference/nextjs/clerk-middleware) grants you access to user authentication state throughout your app. It also allows you to protect specific routes from unauthenticated users. To add `clerkMiddleware()` to your app, follow these steps:

Important

If you're using Next.js ≤15, name your file `middleware.ts` instead of `proxy.ts`. The code itself remains the same; only the filename changes.

1. Create a `proxy.ts` file.



   - If you're using the `/src` directory, create `proxy.ts` in the `/src` directory.
   - If you're not using the `/src` directory, create `proxy.ts` in the root directory.

2. In your `proxy.ts` file, export the `clerkMiddleware()` helper:


proxy.ts

















```
import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
     matcher: [\
       // Skip Next.js internals and all static files, unless found in search params\
       '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',\
       // Always run for API routes\
       '/(api|trpc)(.*)',\
     ],
}
```

3. By default, `clerkMiddleware()` will not protect any routes. All routes are public and you must opt-in to protection for routes. See the [clerkMiddleware() reference](https://clerk.com/docs/reference/nextjs/clerk-middleware) to learn how to require authentication for specific routes.


## [Add `<ClerkProvider>` and Clerk components to your app](https://clerk.com/docs/nextjs/getting-started/quickstart\#add-clerk-provider-and-clerk-components-to-your-app)

The [<ClerkProvider>](https://clerk.com/docs/nextjs/reference/components/clerk-provider) component provides session and user context to Clerk's hooks and components. It's recommended to wrap your entire app at the entry point with `<ClerkProvider>` to make authentication globally accessible. See the [reference docs](https://clerk.com/docs/nextjs/reference/components/clerk-provider) for other configuration options.

Copy and paste the following code into your `layout.tsx` file. This:

- Adds the `<ClerkProvider>` component to your app's layout, providing Clerk's authentication context to your app.
- Creates a header with Clerk's [prebuilt components](https://clerk.com/docs/nextjs/reference/components/overview) to allow users to sign in and out, and display different content for signed-in and signed-out users.

app/layout.tsx

```
import type { Metadata } from 'next'
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

14 lines collapsedconst geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Clerk Next.js Quickstart',
  description: 'Generated by create next app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider>
          <header className="flex justify-end items-center p-4 gap-4 h-16">
            <Show when="signed-out">
              <SignInButton />
              <SignUpButton>
                <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                  Sign Up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
```

This example uses the following components:

- [<Show when="signed-in">](https://clerk.com/docs/nextjs/reference/components/control/show): Children of this component can only be seen while **signed in**.
- [<Show when="signed-out">](https://clerk.com/docs/nextjs/reference/components/control/show): Children of this component can only be seen while **signed out**.
- [<UserButton />](https://clerk.com/docs/nextjs/reference/components/user/user-button): Shows the signed-in user's avatar. Selecting it opens a dropdown menu with account management options.
- [<SignInButton />](https://clerk.com/docs/nextjs/reference/components/unstyled/sign-in-button): An unstyled component that links to the sign-in page. In this example, since no props or [environment variables](https://clerk.com/docs/guides/development/clerk-environment-variables) are set for the sign-in URL, this component links to the [Account Portal sign-in page](https://clerk.com/docs/guides/account-portal/overview#sign-in).
- [<SignUpButton />](https://clerk.com/docs/nextjs/reference/components/unstyled/sign-up-button): An unstyled component that links to the sign-up page. In this example, since no props or [environment variables](https://clerk.com/docs/guides/development/clerk-environment-variables) are set for the sign-up URL, this component links to the [Account Portal sign-up page](https://clerk.com/docs/guides/account-portal/overview#sign-up).

## [Run your project](https://clerk.com/docs/nextjs/getting-started/quickstart\#run-your-project)

Run your project with the following command:

npm

pnpm

yarn

bun

terminal

```
npm run dev
```

## [Create your first user](https://clerk.com/docs/nextjs/getting-started/quickstart\#create-your-first-user)

1. Visit your app's homepage at [http://localhost:3000⁠](http://localhost:3000/).
2. Select "Sign up" on the page and authenticate to create your first user.

Important

To make configuration changes to your Clerk development instance, claim the Clerk keys that were generated for you by selecting **Configure your application** in the bottom right of your app. This will associate the application with your Clerk account.

## [Next steps](https://clerk.com/docs/nextjs/getting-started/quickstart\#next-steps)

Learn more about Clerk components, how to build custom authentication flows, and how to use Clerk's client-side helpers using the following guides.

### [Prebuiltcomponents](https://clerk.com/docs/reference/components/overview)

Learn how to quickly add authentication to your app using Clerk's suite of components.

### [Createacustomsign-in-or-uppage](https://clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page)

Learn how to create a custom sign-in-or-up page with Clerk components.

### [Protectcontentandreaduserdata](https://clerk.com/docs/nextjs/guides/users/reading)

Learn how to use Clerk's hooks and helpers to protect content and read user data in your Next.js app.

### [GetstartedwithOrganizations](https://clerk.com/docs/nextjs/guides/organizations/getting-started)

Learn how to create and manage Organizations in your Next.js app.

## Feedback

What did you think of this content?

It was helpfulIt was not helpfulI have feedback

Last updated onMar 31, 2026

[GitHubEdit on GitHub](https://github.com/clerk/clerk-docs/edit/main/docs/getting-started/quickstart.mdx)

Support