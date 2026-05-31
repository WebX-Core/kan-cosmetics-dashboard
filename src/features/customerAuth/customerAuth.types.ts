export type CustomerSignupDto = Readonly<{
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  phone?: string;
}>;

export type CustomerSigninDto = Readonly<{
  email: string;
  password: string;
}>;

export type CustomerGoogleSigninDto = Readonly<{
  credential: string;
}>;

export type CustomerUpdateProfileDto = Readonly<{
  firstname?: string;
  lastname?: string;
  phone?: string;
  address?: string;
  gender?: string;
  profilePicture?: string | null;
}>;
