# Contacts & Groups Feature Design

**Date:** 2026-05-07
**Status:** Approved

## Summary

Rename "Clientes" to "Contactos" throughout the app. Add contact creation, contact groups with role-based visibility, and a two-column layout for browsing contacts by group.

---

## 1. Database

### New tables

```sql
CREATE TABLE contact_groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  color           text,        -- hex color, e.g. "#6366f1"
  icon            text,        -- lucide-react icon name, e.g. "building2"
  admin_only      boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE contact_group_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (group_id, contact_id)
);
```

### Existing table

`clients` table keeps its name in the DB. Only routes, labels, and UI change to "contactos". This avoids a risky table rename migration while the table is referenced by `event_clients`.

### RLS / indexes

```sql
CREATE INDEX ON contact_groups (organization_id);
CREATE INDEX ON contact_group_members (group_id);
CREATE INDEX ON contact_group_members (contact_id);
```

RLS policies mirror the existing `clients` table patterns: org-scoped, membership required.

---

## 2. Visibility Rules

Role comes from the existing `resolveOrgMember` helper.

**Admin:** sees all groups and all contacts.

**Member:** sees only groups where `admin_only = false`. Sees only contacts that have at least one non-admin group, or have no group at all. Contacts that exist exclusively inside admin-only groups are invisible to members.

SQL filter for member-visible contacts:

```sql
-- visible to member if: no group at all, OR has at least one non-admin group
WHERE NOT EXISTS (
  SELECT 1 FROM contact_group_members cgm
  JOIN contact_groups g ON g.id = cgm.group_id
  WHERE cgm.contact_id = c.id
    AND g.organization_id = $org_id
)
OR EXISTS (
  SELECT 1 FROM contact_group_members cgm
  JOIN contact_groups g ON g.id = cgm.group_id
  WHERE cgm.contact_id = c.id
    AND g.organization_id = $org_id
    AND g.admin_only = false
)
```

---

## 3. Routes and File Structure

### Route change

`/dashboard/clients` -> `/dashboard/contacts`

A redirect is added so existing links (including event-client pages) continue to work:

```ts
// next.config.ts
redirects: [
  { source: '/dashboard/clients', destination: '/dashboard/contacts', permanent: true }
]
```

### New files

```
app/dashboard/contacts/
  page.tsx                   # two-column layout, server component shell
  actions.ts                 # contact CRUD server actions
  groups/
    actions.ts               # group CRUD server actions

components/contacts/
  ContactsLayout.tsx         # two-column wrapper
  GroupsPanel.tsx            # left panel: group list + create button
  ContactsList.tsx           # right panel: filtered contact list + search
  ContactCard.tsx            # single contact row with group tags
  NewContactDialog.tsx       # create contact modal (name, email, phone + optional groups)
  EditContactDialog.tsx      # edit contact modal (all fields + groups multi-select)
  NewGroupDialog.tsx         # create group modal
  EditGroupDialog.tsx        # edit group modal
```

### Sidebar update

```ts
// components/dashboard/Sidebar.tsx
{ href: '/dashboard/contacts', label: 'Contactos', icon: Users }
```

---

## 4. Server Actions

### contacts/actions.ts

| Action | Description | Admin | Member |
|--------|-------------|-------|--------|
| `loadContactsAction(groupId?)` | Load contacts, optionally filtered by group. Applies visibility filter for members. | all | filtered |
| `loadGroupsAction()` | Load groups for org. Excludes admin_only for members. | all | filtered |
| `createContactAction(data)` | Create contact with optional group assignments. Member cannot assign to admin-only groups. | yes | yes |
| `updateContactAction(id, data)` | Update contact fields. Member cannot update contacts invisible to them. | yes | visible only |
| `deactivateContactAction(id)` | Soft-delete (is_active = false). | yes | visible only |
| `addContactToGroupAction(contactId, groupId)` | Add contact to group. Member blocked from admin-only groups. | yes | non-admin only |
| `removeContactFromGroupAction(contactId, groupId)` | Remove contact from group. | yes | non-admin only |

### contacts/groups/actions.ts

| Action | Description | Admin | Member |
|--------|-------------|-------|--------|
| `createGroupAction(data)` | Create group. `admin_only` forced to false for members. | yes | yes (non-admin) |
| `updateGroupAction(id, data)` | Update group attributes. | yes | no |
| `deleteGroupAction(id)` | Delete group (members reassigned to no group). | yes | no |

All actions call `resolveOrgMember` first and throw if not a member of the org.

---

## 5. UI and Interactions

### Layout

Two-column layout:
- **Left (240px):** Groups panel with "Todos", "Sem grupo", then named groups with color dot, count badge, and "Admin" badge for admin-only groups. "+" button in header to create a group.
- **Right (flex):** Contact list header with search input and "Novo contacto" button. Cards below.

### URL state

- `?group=<id>` — selected group filters the right panel
- `?q=<search>` — search term, debounced 300ms

### Contact card

Shows: avatar (initials), name, email, phone, group tags (colored). Edit icon appears on hover.

### Create contact flow

1. Click "Novo contacto"
2. Modal: name (required), email, phone
3. Optional group multi-select (member sees only non-admin groups)
4. Submit -> `createContactAction` -> toast -> list refreshes

### Create group flow

1. Click "+" in groups panel header
2. Modal: name (required), description, color (8 preset colors), icon (optional lucide name), "Visivel apenas a admins" toggle (admin-only, hidden from members)
3. Submit -> `createGroupAction` -> group appears in left panel

### Edit contact flow

1. Hover card -> pencil icon
2. Modal with all fields + groups multi-select
3. Submit -> `updateContactAction` + group membership sync

### Filtering

- Click group in left panel -> right panel shows only contacts in that group
- "Todos" -> all visible contacts
- "Sem grupo" -> contacts with no group assignments
- Search filters by name, email, phone (client-side if < 200 contacts, else server-side)

---

## 6. Error Handling

- All server actions return `{ error: string } | { data: T }` pattern (matches existing codebase).
- Permission violations return a generic error ("Sem permissão") — no leaking of admin group names.
- Group delete: if group has members, action still proceeds (members move to "Sem grupo").

---

## 7. Out of Scope

- Renaming the `clients` DB table (deferred, too many FK dependencies).
- Bulk contact import into groups (existing CSV import on event pages stays unchanged).
- Per-contact permission overrides (groups are the only visibility unit).
- Contact detail page at `/dashboard/contacts/[id]` (future).
