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