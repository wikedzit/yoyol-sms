import { Outlet } from "react-router";

const AuthLayout = () => {
  return (
    <div className="relative overflow-hidden">
      <div className="h-screen w-full top-0 left-0 z-30">
        <div className="grid grid-cols-1 h-full content-center">
          <div className="border-b hidden md:grid grid-cols-2 border-border-color">
            <div className="flex flex-col items-center justify-end -mb-4.5">
              <img src="/assets/auth-page/message-left.png" alt="auth-bg" />
              <img src="/assets/auth-page/people-left.png" alt="auth-bg" />
            </div>
            <div className="flex flex-col items-center justify-end -mb-4.5">
              <img src="/assets/auth-page/message-right.png" alt="auth-bg" />

              <img src="/assets/auth-page/people-right.png" alt="auth-bg" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-0 left-0 w-full z-40 flex flex-col items-center justify-start h-screen space-y-6 py-20 xl:py-28 overflow-y-auto">
        <img
          className="hidden md:block absolute translate-x-1/4 top-24 xl:top-48 left-1/2 h-[73px] w-[200px]"
          src="/assets/auth-page/signature.png"
          alt="auth-bg"
        />
        <div className="flex items-center justify-center gap-3 text-2xl font-semibold text-black mb-10">
          <span>Welcome to</span>
          <img
            className="w-[70px] mt-4"
            src="/assets/auth-page/yoyol-logo.png"
            alt="logo"
          />
          <span>Student management system</span>
        </div>
        <div className="w-full mt-16 md:mt-24 px-5 flex justify-center">
          <Outlet />
        </div>
        <p className="text-gray text-sm">
          Copyright @yoyol 2025 | Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;
