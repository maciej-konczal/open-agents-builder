'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export default function GeneralPage() {
  return (
    <div className="space-y-6">
      <form className="space-y-4">
      <div>
        <label htmlFor="projectName" className="block text-sm font-medium">
        Agent Name
        </label>
        <Input
        type="text"
        id="projectName"
        name="projectName"
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="welcomeInfo" className="block text-sm font-medium">
          Welcome Message
        </label>
        <Textarea
          id="welcomeInfo"
          name="welcomeInfo"
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="termsConditions" className="block text-sm font-medium">
          Terms and Conditions
        </label>
        <Textarea
          id="termsConditions"
          name="termsConditions"
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="confirmTerms" className="flex items-center text-sm font-medium">
          <Input
        type="checkbox"
        id="confirmTerms"
        name="confirmTerms"
        className="mr-2 w-4"
          />
          Must confirm terms and conditions
        </label>
      </div>
      <div>
        <label htmlFor="resultEmail" className="block text-sm font-medium">
        Result Email
        </label>
        <Input
        type="email"
        id="resultEmail"
        name="resultEmail"
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="collectUserInfo" className="flex items-center text-sm font-medium">
          <Input
            type="checkbox"
            id="collectUserInfo"
            name="collectUserInfo"
            className="mr-2 w-4"
          />
          Collect user e-mail addresses and names
        </label>
      </div>
      <div>
        <Button
        type="submit"
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
        Save
        </Button>
      </div>
      </form>
    </div>
  );
}