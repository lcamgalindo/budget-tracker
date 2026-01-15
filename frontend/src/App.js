import { useState } from 'react';
import { styles } from './styles';
import UploadScreen from './screens/UploadScreen';
import ManualEntryScreen from './screens/ManualEntryScreen';
import ReviewScreen from './screens/ReviewScreen';
import DashboardScreen from './screens/DashboardScreen';
import BudgetSettingsScreen from './screens/BudgetSettingsScreen';
import CategoryDetailScreen from './screens/CategoryDetailScreen';
import CategoryManageScreen from './screens/CategoryManageScreen';
import CategoryEditScreen from './screens/CategoryEditScreen';
import ReceiptEditScreen from './screens/ReceiptEditScreen';

function App() {
  const [screen, setScreen] = useState('dashboard');
  const [lastReceipt, setLastReceipt] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBudgetInfo, setSelectedBudgetInfo] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [dashboardMonth, setDashboardMonth] = useState({ 
    year: new Date().getFullYear(), 
    month: new Date().getMonth() + 1 
  });
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = (newScreen, data) => {
    if (data) setLastReceipt(data);
    if (newScreen === 'dashboard') setRefreshKey(k => k + 1);
    setScreen(newScreen);
  };

  const handleCategorySelect = (category, budgetInfo, month) => {
    setSelectedCategory(category);
    setSelectedBudgetInfo(budgetInfo);
    setSelectedMonth(month);
    setScreen('categoryDetail');
  };

  const handleReceiptSelect = (receipt) => {
    setSelectedReceipt(receipt);
    setScreen('receiptEdit');
  };

  const handleCategoryEdit = (category) => {
    setEditingCategory(category);
    setScreen('categoryEdit');
  };

  return (
    <div style={styles.app}>
      {screen === 'upload' && (
        <UploadScreen 
          onSuccess={(r) => navigate('review', r)} 
          onManualEntry={() => navigate('manual')}
          onBack={() => navigate('dashboard')}
        />
      )}
      {screen === 'manual' && (
        <ManualEntryScreen 
          onSuccess={() => navigate('dashboard')} 
          onCancel={() => navigate('upload')}
        />
      )}
      {screen === 'review' && (
        <ReviewScreen 
          receipt={lastReceipt} 
          onDone={() => navigate('dashboard')} 
        />
      )}
      {screen === 'dashboard' && (
        <DashboardScreen 
          key={refreshKey}
          onAdd={() => navigate('upload')}
          onSettings={() => navigate('settings')}
          onCategorySelect={handleCategorySelect}
          onMonthChange={setDashboardMonth}
        />
      )}
      {screen === 'settings' && (
        <BudgetSettingsScreen 
          month={dashboardMonth}
          onBack={() => navigate('dashboard')}
          onManageCategories={() => navigate('categoryManage')}
        />
      )}
      {screen === 'categoryDetail' && (
        <CategoryDetailScreen
          category={selectedCategory}
          budgetInfo={selectedBudgetInfo}
          month={selectedMonth}
          onBack={() => navigate('dashboard')}
          onReceiptSelect={handleReceiptSelect}
        />
      )}
      {screen === 'categoryManage' && (
        <CategoryManageScreen
          onBack={() => navigate('settings')}
          onEdit={handleCategoryEdit}
        />
      )}
      {screen === 'categoryEdit' && (
        <CategoryEditScreen
          category={editingCategory}
          onBack={() => navigate('categoryManage')}
          onSaved={() => navigate('categoryManage')}
        />
      )}
      {screen === 'receiptEdit' && (
        <ReceiptEditScreen
          receipt={selectedReceipt}
          onBack={() => navigate('categoryDetail')}
          onSaved={() => {
            setSelectedReceipt(null);
            navigate('dashboard');
          }}
        />
      )}
    </div>
  );
}

export default App;