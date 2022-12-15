const defaultOptions = {
  dialect: 'postgres',
  username: 'postgres',
  password: 'password',
  logging: false,
  host: process.env.DB_HOSTNAME || 'localhost',
  migrationStorageTableName: 'sequelize_meta',
  define: { paranoid: true, underscored: true },
};

module.exports = {
  development: {
    ...defaultOptions,
    database: 'caniaffordto_development',
    logging: console.log,
  },
  test: {
    ...defaultOptions,
    database: 'caniaffordto_test',
  },
  staging: {
    ...defaultOptions,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  production: {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false,
    migrationStorageTableName: 'sequelize_meta',
    define: { paranoid: true, underscored: true },
    ssl: true,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    url: process.env.DATABASE_URL, // automatically set by heroku
  },
};
