
import { Employee, Role, DingAttendanceRecord } from '../types';
import { MOCK_EMPLOYEES } from '../constants';

const TARGET_URL = 'https://api.dingcenter.com/webservice/attendance/list';
// Using corsproxy.io to bypass CORS issues on client-side
const PROXY_URL = 'https://corsproxy.io/?'; 

const API_TOKEN = '$2y$10$i.lQI81AN9lyE4YBbvCVzuytbNHuc9dTGLbtDW9HCUTdZG1Bo6WY2';
const ADMIN_MOBILE = '989122204008';

const formatDingDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

export const fetchEmployeesFromDing = async (): Promise<Employee[]> => {
  // Increased timeout for slower networks/proxies
  const controller = new AbortController();
  // Set timeout to 30 seconds (30000ms) to allow more time for the proxy
  const timeoutId = setTimeout(() => controller.abort(), 30000); 

  try {
    const endDate = new Date();
    const startDate = new Date();
    // Retrieve data for the last 30 days to ensure we catch all active employees
    startDate.setDate(startDate.getDate() - 30);

    // Using URLSearchParams to correctly encode parameters (dates, token with special chars)
    const params = new URLSearchParams({
      api_token: API_TOKEN,
      from_date_time: formatDingDate(startDate),
      to_date_time: formatDingDate(endDate),
    });

    // The user verified the API works via a GET request link.
    // We construct the URL with query parameters.
    const targetUrl = `${TARGET_URL}?${params.toString()}`;
    
    // Pass the encoded target URL to the proxy
    // encoding ensures characters like ? and & in the target url don't confuse the proxy
    const finalUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

    console.log('Fetching employees from Ding API...', { targetUrl });

    const response = await fetch(finalUrl, {
      method: 'GET', // Switching to GET as per user verification
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Ding API Error: ${response.status} ${response.statusText}`);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();

    // Validate data structure
    let records: DingAttendanceRecord[] = [];
    if (Array.isArray(data)) {
      records = data;
    } else if (data && Array.isArray(data.data)) {
        records = data.data;
    } else {
      console.warn('Ding API response format unexpected (not array), falling back to mocks.', data);
      return MOCK_EMPLOYEES;
    }

    const uniqueUsersMap = new Map<string, Employee>();

    records.forEach((record: any) => {
      // Handle various potential field names for mobile
      const mobile = record.cell_number || record.mobile || record.phone;
      if (!mobile) return;

      if (!uniqueUsersMap.has(mobile)) {
        const isUserAdmin = mobile === ADMIN_MOBILE;
        
        let avatar = record.profile_image;
        // If avatar is missing or empty, ensure it is an empty string so UserAvatar component renders the icon
        if (!avatar || typeof avatar !== 'string' || avatar.trim() === '') {
           avatar = ''; 
        }

        uniqueUsersMap.set(mobile, {
          id: mobile, 
          name: `${record.first_name || 'کاربر'} ${record.last_name || 'مهمان'}`,
          mobile: mobile,
          role: isUserAdmin ? Role.ADMIN : Role.EMPLOYEE,
          department: 'نامشخص', 
          avatar: avatar
        });
      }
    });

    const employees = Array.from(uniqueUsersMap.values());

    if (employees.length === 0) {
        console.warn('No employees found in Ding API response, falling back to mocks.');
        return MOCK_EMPLOYEES;
    }

    console.log(`Successfully fetched ${employees.length} employees from Ding.`);
    return employees;

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
         console.error('Ding API Request timed out after 30 seconds');
    } else {
         console.error('Failed to fetch from Ding API:', error);
    }
    // Return mocks so the app remains usable even if API fails
    return MOCK_EMPLOYEES;
  }
};
