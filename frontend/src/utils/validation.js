// バリデーションユーティリティ

// メールアドレスの検証
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return { isValid: false, error: 'メールアドレスを入力してください' };
  }
  if (!emailRegex.test(email)) {
    return { isValid: false, error: '有効なメールアドレスを入力してください' };
  }
  return { isValid: true, error: null };
};

// 電話番号の検証
export const validatePhone = (phone) => {
  // 日本の電話番号形式
  const phoneRegex = /^(0[0-9]{1,4}-?[0-9]{1,4}-?[0-9]{3,4}|0[0-9]{9,10})$/;
  
  if (!phone) {
    return { isValid: false, error: '電話番号を入力してください' };
  }
  
  // ハイフンを除去して検証
  const cleanPhone = phone.replace(/-/g, '');
  
  if (!phoneRegex.test(phone) && !phoneRegex.test(cleanPhone)) {
    return { isValid: false, error: '有効な電話番号を入力してください（例: 03-1234-5678）' };
  }
  
  return { isValid: true, error: null };
};

// 名前の検証
export const validateName = (name, fieldName = '名前') => {
  if (!name || !name.trim()) {
    return { isValid: false, error: `${fieldName}を入力してください` };
  }
  if (name.trim().length < 1) {
    return { isValid: false, error: `${fieldName}は1文字以上入力してください` };
  }
  if (name.length > 50) {
    return { isValid: false, error: `${fieldName}は50文字以内で入力してください` };
  }
  return { isValid: true, error: null };
};

// 日付の検証
export const validateDateRange = (checkIn, checkOut) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  
  if (!checkIn) {
    return { isValid: false, error: 'チェックイン日を選択してください' };
  }
  
  if (!checkOut) {
    return { isValid: false, error: 'チェックアウト日を選択してください' };
  }
  
  if (checkInDate < today) {
    return { isValid: false, error: 'チェックイン日は今日以降の日付を選択してください' };
  }
  
  if (checkOutDate <= checkInDate) {
    return { isValid: false, error: 'チェックアウト日はチェックイン日より後の日付を選択してください' };
  }
  
  // 最大宿泊日数のチェック（30日）
  const daysDiff = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  if (daysDiff > 30) {
    return { isValid: false, error: '宿泊日数は30日以内で設定してください' };
  }
  
  return { isValid: true, error: null };
};

// ゲスト数の検証
export const validateGuests = (guests, rooms) => {
  if (!guests || guests < 1) {
    return { isValid: false, error: 'ゲスト数は1名以上を指定してください' };
  }
  
  if (guests > 10) {
    return { isValid: false, error: 'ゲスト数は10名以下で指定してください' };
  }
  
  if (!rooms || rooms < 1) {
    return { isValid: false, error: '部屋数は1室以上を指定してください' };
  }
  
  if (rooms > 5) {
    return { isValid: false, error: '部屋数は5室以下で指定してください' };
  }
  
  // 1部屋あたりの最大人数チェック（4名）
  if (guests / rooms > 4) {
    return { isValid: false, error: '1部屋あたり最大4名までです' };
  }
  
  return { isValid: true, error: null };
};

// クレジットカード番号の検証（簡易版）
export const validateCreditCard = (cardNumber) => {
  if (!cardNumber) {
    return { isValid: false, error: 'クレジットカード番号を入力してください' };
  }
  
  // スペースとハイフンを除去
  const cleanNumber = cardNumber.replace(/[\s-]/g, '');
  
  // 数字のみかチェック
  if (!/^\d+$/.test(cleanNumber)) {
    return { isValid: false, error: 'クレジットカード番号は数字のみ入力してください' };
  }
  
  // 桁数チェック（13-19桁）
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return { isValid: false, error: '有効なクレジットカード番号を入力してください' };
  }
  
  // Luhnアルゴリズムによる検証
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  if (sum % 10 !== 0) {
    return { isValid: false, error: '無効なクレジットカード番号です' };
  }
  
  return { isValid: true, error: null };
};

// 特別リクエストの検証
export const validateSpecialRequest = (request) => {
  if (request && request.length > 500) {
    return { isValid: false, error: '特別リクエストは500文字以内で入力してください' };
  }
  return { isValid: true, error: null };
};

// 全体のフォームバリデーション
export const validateBookingForm = (formData) => {
  const errors = {};
  
  // 名前の検証
  const lastNameValidation = validateName(formData.lastName, '姓');
  if (!lastNameValidation.isValid) {
    errors.lastName = lastNameValidation.error;
  }
  
  const firstNameValidation = validateName(formData.firstName, '名');
  if (!firstNameValidation.isValid) {
    errors.firstName = firstNameValidation.error;
  }
  
  // メールアドレスの検証
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error;
  }
  
  // 電話番号の検証
  const phoneValidation = validatePhone(formData.phone);
  if (!phoneValidation.isValid) {
    errors.phone = phoneValidation.error;
  }
  
  // 特別リクエストの検証
  const requestValidation = validateSpecialRequest(formData.specialRequests);
  if (!requestValidation.isValid) {
    errors.specialRequests = requestValidation.error;
  }
  
  // 利用規約の同意
  if (!formData.agreed) {
    errors.agreed = '利用規約に同意してください';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// リアルタイムバリデーション用のヘルパー
export const getFieldValidator = (fieldName) => {
  switch (fieldName) {
    case 'email':
      return validateEmail;
    case 'phone':
      return validatePhone;
    case 'lastName':
      return (value) => validateName(value, '姓');
    case 'firstName':
      return (value) => validateName(value, '名');
    case 'specialRequests':
      return validateSpecialRequest;
    default:
      return () => ({ isValid: true, error: null });
  }
};