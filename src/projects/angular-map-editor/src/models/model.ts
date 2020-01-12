import * as _ from 'lodash';

export class Model<T extends Object> {
  constructor(init?: Partial<T>) {

    _.assign(this, init);

  }
}
