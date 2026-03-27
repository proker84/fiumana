import { NextRequest, NextResponse } from 'next/server';
import { dbQueryOne } from '@/lib/db';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username e password obbligatori' }, { status: 400 });
    }

    const user = await dbQueryOne('SELECT * FROM admin_users WHERE username = ?', [username]);

    if (!user) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 });
    }

    const valid = bcrypt.compareSync(password, user.password_hash as string);
    if (!valid) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 });
    }

    const token = signToken({
      userId: user.id as number,
      username: user.username as string,
      nome: user.nome as string,
    });

    return NextResponse.json({ token, user: { id: user.id, nome: user.nome } });
  } catch (error: any) {
    return NextResponse.json({ error: 'Errore server: ' + error.message }, { status: 500 });
  }
}
