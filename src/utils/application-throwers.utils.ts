import { DBApplicationApplicationsService } from '../services';
import { ApplicationNotFoundException } from '../exceptions';

export async function applicationExistThrower(
  userid: bigint,
  service: DBApplicationApplicationsService,
) {
  const app = await service.getApp(userid);
  if (!app) throw new ApplicationNotFoundException();
}
