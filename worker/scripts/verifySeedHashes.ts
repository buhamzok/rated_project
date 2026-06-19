import { comparePassword, hashPassword } from '../src/services/auth.service';

const superAdmin = 'Admin123!';
const plainAdmin = 'AdminPass123!';

async function main() {
  const superHash = 'pbkdf2:100000:kvIPnsqiYkdfQK4KmBZCyQ==:H7PQM7MWQ2s8BH+oAKFP3uxj5nCE2eVRns6OBcsTXTU=';
  const adminHash = 'pbkdf2:100000:5QtPewpthfub/hVCzzPdJg==:Zlk+4nRaiygNLCX2KnS9FmtukfB6F6XJiUTW4vRz04A=';
  const h1 = await comparePassword(superAdmin, superHash);
  const h2 = await comparePassword(plainAdmin, adminHash);
  const fresh = await hashPassword(superAdmin);
  const h3 = await comparePassword(superAdmin, fresh);
  console.log('Super admin seed hash valid:', h1);
  console.log('Admin seed hash valid:', h2);
  console.log('Fresh hash round-trip:', h3);
  console.log('Fresh hash:', fresh);
}

main().catch(console.error);
