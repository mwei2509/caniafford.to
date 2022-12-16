# caniafford.to

### Tech Stack

- Frontend is a React/Redux app in Typescript
- Backend is a Koa app in Typescript
- PostgreSQL database
- CircleCI
- Docker
- Heroku
- [AWS Lambda function for projections](https://us-east-1.console.aws.amazon.com/lambda/home?region=us-east-1#/functions/caniaffordto_projections?newFunction=true&tab=code)

## Development

- Prerequisites:
  - Using Node 18
  - Docker installed

```
docker-compose up
```

- This will bring up api server, web server, and postgres DB

## Deploys

### Projections Lambda Function

Lambda function is buitl and deployed to AWS lambda on new tag with circleci
Create a new tag with `strapp` (`brew install mwei2509/taps/strapp`):
`strapp repo:create-next-tag`
