import { useEffect } from 'react';
import { getAllCompanies } from '../services/companyService';
import { useCompanyStore } from '../store/companyStore';

export function useEnsureCompaniesLoaded() {
    const { companies, setCompanies, selectedCompanyId, selectCompany } = useCompanyStore();

    useEffect(() => {
        let cancelled = false;

        const loadCompanies = async () => {
            if (companies.length > 0) {
                if (!selectedCompanyId && companies[0]?.id) {
                    selectCompany(companies[0].id);
                }
                return;
            }

            const allCompanies = await getAllCompanies();
            if (cancelled || !allCompanies.length) return;

            setCompanies(allCompanies);

            if (!selectedCompanyId && allCompanies[0]?.id) {
                selectCompany(allCompanies[0].id);
            }
        };

        loadCompanies().catch((error) => {
            console.error('Failed to load companies', error);
        });

        return () => {
            cancelled = true;
        };
    }, [companies, selectedCompanyId, selectCompany, setCompanies]);

    return {
        companies,
        selectedCompanyId,
        selectCompany
    };
}

export default useEnsureCompaniesLoaded;
