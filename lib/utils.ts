export const compressImage = (file: File, maxWidth: number = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      resolve(""); // Not an image
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context failed"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7)); // 70% quality jpeg
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const formatDays = (days: number): string => {
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  
  if (weeks === 0) return `${days} days`;
  if (remainingDays === 0) return `${weeks} week${weeks > 1 ? "s" : ""}`;
  return `${weeks}w ${remainingDays}d`;
};
