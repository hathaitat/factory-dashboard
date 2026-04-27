import React, { Suspense, lazy } from 'react';
import PageHeader, { HELP_CONTENT } from '../components/PageHeader';

const GuideTab = lazy(() => import('../components/dashboard/GuideTab'));

const GuidePage = () => {
    return (
        <div style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <PageHeader
                title="คู่มือการใช้งานระบบ (System Guide)"
                helpContent={HELP_CONTENT.guide}
            />
            
            <div style={{ flex: 1, minHeight: 0 }}>
                <Suspense fallback={
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)' }}>
                        <div className="loading-spinner"></div>
                        <span>กำลังโหลดคู่มือ...</span>
                    </div>
                }>
                    <GuideTab />
                </Suspense>
            </div>
        </div>
    );
};

export default GuidePage;
