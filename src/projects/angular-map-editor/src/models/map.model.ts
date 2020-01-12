import {Model} from './model';

export class MapModel extends Model<MapModel>{

  /**
   * Initializes a new instance of this model.
   * @param init Optional init params that will feed the class properties.
   */
  constructor(init?: Partial<MapModel>) {
    super(init);
  }
}
