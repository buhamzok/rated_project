import { hashPassword } from '../src/services/auth.service';

async function main() {
  const superHash = await hashPassword('Admin123!');
  const adminHash = await hashPassword('AdminPass123!');
  console.log('Super admin:', superHash);
  console.log('Admin:', adminHash);
}

main().catch(console.error);
