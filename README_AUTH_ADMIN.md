# TAJ Frontend — Authentication & Admin Pages

## Created Pages

### Authentication
- **`/login`** — Agent login page with email/password authentication
- **`/logout`** — Session termination page

### Dashboard
- **`/dashboard`** — Main dashboard with stats, recent activity, alerts, and quick actions

### Administration
- **`/admin/agents`** — Manage agents, roles, classifications, and account status
- **`/admin/services`** — Manage commissariats, brigades, parquets, and other services
- **`/admin/roles`** — Manage RBAC roles (7 roles) with permissions and classification levels
- **`/admin/audit`** — Central audit log viewer with filtering and severity indicators

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── login/
│   │           └── route.ts          # Mock authentication endpoint
│   ├── admin/
│   │   ├── agents/
│   │   │   └── page.tsx              # Agent management
│   │   ├── audit/
│   │   │   └── page.tsx              # Audit log viewer
│   │   ├── roles/
│   │   │   └── page.tsx              # Role management
│   │   └── services/
│   │       └── page.tsx              # Service management
│   ├── dashboard/
│   │   └── page.tsx                  # Main dashboard
│   ├── login/
│   │   └── page.tsx                  # Login page
│   ├── logout/
│   │   └── page.tsx                  # Logout page
│   ├── layout.tsx                    # Root layout (updated with AuthProvider)
│   ├── page.tsx                      # Root redirect to /login
│   └── globals.css
├── components/
│   ├── AdminLayout.tsx               # Shared layout for admin pages
│   └── ui.tsx                        # Reusable UI components (Card, Badge, Button, etc.)
├── context/
│   └── AuthContext.tsx               # Authentication context & hooks
└── types/
    └── index.ts                      # TypeScript type definitions
```

## Key Features

### UI Components (`src/components/ui.tsx`)
- **Badge** — Status badges with variants
- **Card** — Container component for content
- **Button** — Reusable button with variants (primary, secondary, danger)
- **Input** — Text input field
- **Select** — Dropdown select
- **Table** — Responsive table with custom rendering

### Admin Layout (`src/components/AdminLayout.tsx`)
- Collapsible sidebar navigation
- User profile display
- Logout functionality
- Active page highlighting
- Dark mode support

### Authentication (`src/context/AuthContext.tsx`)
- `useAuth()` hook for accessing session
- Login/logout functionality
- Token persistence in localStorage
- Error handling

## Demo Credentials

For testing, use these credentials on the login page:

| Email | Password | Role |
|-------|----------|------|
| jean.dupont@police.gouv.fr | password123 | agent_saisie |
| pierre.martin@gendarmerie.gouv.fr | password123 | opj |

## Bell-LaPadula Classification Levels

The system enforces four classification levels:

- **NC (0)** — Non Classifié
- **CD (1)** — Confidentiel Défense
- **SD (2)** — Secret Défense
- **TSD (3)** — Très Secret Défense

Each role has a maximum classification level they can access.

## RBAC Roles (7 Total)

1. **agent_saisie** — Data entry agent (max: CD)
2. **opj** — Judicial Police Officer (max: SD)
3. **magistrat** — Magistrate (max: TSD)
4. **analyste_renseignement** — Intelligence analyst (max: SD)
5. **admin_systeme** — System admin (max: TSD)
6. **auditeur** — Auditor (max: SD, read-only)
7. **controleur_cnil** — CNIL controller (max: CD, anonymized views only)

## Mock Data

All pages use mock data for demonstration. The mock login endpoint (`/api/auth/login`) accepts the credentials listed above.

## Next Steps

To complete the system:

1. **Backend API Integration** — Replace mock endpoints with real API calls
2. **Database Connection** — Connect to PostgreSQL database
3. **RLS Policies** — Implement Row-Level Security policies per classification level
4. **Audit Logging** — Integrate with audit_log table
5. **Role-Based Access Control** — Enforce RLS policies based on agent role
6. **Error Handling** — Add comprehensive error handling and logging
7. **Additional Pages** — Create pages for:
   - Person search and profile (`/personnes`, `/personnes/[id]`)
   - Case management (`/affaires`, `/affaires/[id]`)
   - Signalements/Alerts (`/signalements`)
   - Advanced search (`/recherche`)
   - Reporting (`/rapports`)

## Styling

- **Tailwind CSS v4** for styling
- **Dark mode support** built-in (dark: prefix)
- **Responsive design** with mobile-first approach
- **Accessibility** considered in component design

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start

# Lint
pnpm lint
```

Visit `http://localhost:3000` and you'll be redirected to `/login`.
