# Railway Public API — Reference

Scraped from https://docs.railway.com/integrations/api on 2026-04-08.

## Endpoint

```
https://backboard.railway.com/graphql/v2
```

## Token Types

| Token Type | Scope | Best For |
| --- | --- | --- |
| Account token | All your resources and workspaces | Personal scripts, local development |
| Workspace token | Single workspace | Team CI/CD, shared automation |
| Project token | Single environment in a project | Deployments, service-specific automation |
| OAuth | User-granted permissions | Third-party apps acting on behalf of users |

### Account and workspace tokens

Create at https://railway.com/account/tokens

- **Account token** — "No workspace" = broadest scope, all resources/workspaces.
- **Workspace token** — Select a workspace, scoped to that workspace only.

### Project tokens

Create from project settings > tokens page. Scoped to a specific environment.

**Note:** Project tokens use `Project-Access-Token` header, not `Authorization: Bearer`.

## Authentication

### Account/workspace tokens

```
curl --request POST \
  --url https://backboard.railway.com/graphql/v2 \
  --header 'Authorization: Bearer <API_TOKEN>' \
  --header 'Content-Type: application/json' \
  --data '{"query":"query { me { name email } }"}'
```

### Project tokens

```
curl --request POST \
  --url https://backboard.railway.com/graphql/v2 \
  --header 'Project-Access-Token: <PROJECT_TOKEN>' \
  --header 'Content-Type: application/json' \
  --data '{"query":"query { projectToken { projectId environmentId } }"}'
```

## Managing Variables

### Get variables

```graphql
query variables($projectId: String!, $environmentId: String!, $serviceId: String) {
  variables(
    projectId: $projectId
    environmentId: $environmentId
    serviceId: $serviceId
  )
}
```

### Upsert a variable

```graphql
mutation variableUpsert($input: VariableUpsertInput!) {
  variableUpsert(input: $input)
}
```

Variables:
```json
{
  "input": {
    "projectId": "project-id",
    "environmentId": "environment-id",
    "serviceId": "service-id",
    "name": "API_KEY",
    "value": "secret-key-here"
  }
}
```

### Upsert multiple variables

```graphql
mutation variableCollectionUpsert($input: VariableCollectionUpsertInput!) {
  variableCollectionUpsert(input: $input)
}
```

Variables:
```json
{
  "input": {
    "projectId": "project-id",
    "environmentId": "environment-id",
    "serviceId": "service-id",
    "variables": {
      "KEY1": "value1",
      "KEY2": "value2"
    }
  }
}
```

### Delete a variable

```graphql
mutation variableDelete($input: VariableDeleteInput!) {
  variableDelete(input: $input)
}
```

## Rate Limits

- Free: 100 RPH
- Hobby: 1000 RPH, 10 RPS
- Pro: 10000 RPH, 50 RPS

## Tips

- Use `Cmd/Ctrl + K` in Railway dashboard to copy project/service/environment IDs.
- Network tab in browser shows the exact GraphQL queries the dashboard uses.
- GraphiQL playground: https://railway.com/graphiql
