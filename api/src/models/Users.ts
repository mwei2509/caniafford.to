import { Table, Column, Model, HasMany } from 'sequelize-typescript';

@Table
class Person extends Model {
    @Column
    email: string;

    @Column
    birthday: Date;
}
export default Person;