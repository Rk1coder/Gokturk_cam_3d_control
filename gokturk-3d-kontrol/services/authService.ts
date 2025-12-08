import { User, UserRole } from '../types';

class AuthService {
  private currentUser: User | null = null;

  constructor() {
    const stored = localStorage.getItem('gokturk_user');
    if (stored) {
      this.currentUser = JSON.parse(stored);
    }
  }

  login(username: string, password: string): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock Login Logic
        if (username === 'admin' && password === '1234') {
          const user: User = { username: 'Admin', role: UserRole.ADMIN };
          this.currentUser = user;
          localStorage.setItem('gokturk_user', JSON.stringify(user));
          resolve(user);
        } else if (username === 'izleyici' && password === '1234') {
          const user: User = { username: 'İzleyici', role: UserRole.VIEWER };
          this.currentUser = user;
          localStorage.setItem('gokturk_user', JSON.stringify(user));
          resolve(user);
        } else {
          reject(new Error('Kullanıcı adı veya şifre hatalı.'));
        }
      }, 500);
    });
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('gokturk_user');
    window.location.reload();
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }
}

export const authService = new AuthService();