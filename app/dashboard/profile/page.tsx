import EditProfileForm from "@/components/admin/EditProfileForm";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 text-white">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.2em] text-white/40">
          DJ Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold">Edit Profile</h1>
      </div>

      <EditProfileForm />
    </div>
  );
}
