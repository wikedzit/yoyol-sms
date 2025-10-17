import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';

export default function StudentsPage() {
  const [open, setOpen] = useState(false);

  const [students, setStudents] = useState([
    {
      id: 1,
      studentId: 'STU001',
      firstName: 'John',
      secondName: 'Doe',
      gender: 'Male',
      dob: '2005-03-12',
      className: 'Form 1',
      phone: '+255 712 345 678',
      address: 'Arusha, Tanzania',
    },
    {
      id: 2,
      studentId: 'STU002',
      firstName: 'Jane',
      secondName: 'Smith',
      gender: 'Female',
      dob: '2006-05-21',
      className: 'Form 2',
      phone: '+255 713 876 543',
      address: 'Moshi, Tanzania',
    },
    {
      id: 3,
      studentId: 'STU003',
      firstName: 'Michael',
      secondName: 'Brown',
      gender: 'Male',
      dob: '2004-11-02',
      className: 'Form 3',
      phone: '+255 715 567 890',
      address: 'Dar es Salaam, Tanzania',
    },
  ]);

  const handleEdit = (student: any) => {
    console.log('Edit student:', student);
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    console.log('Delete student ID:', id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
          Students
        </h1>
        <Button className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] cursor-pointer duration-300 hover:bg-[var(--color-purple)] focus:ring-2 focus:ring-[var(--color-purple)] disabled:opacity-50 disabled:cursor-not-allowed">
          <Plus className="h-4 w-4" />
          Add Student
        </Button>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-100 text-xs sm:text-sm uppercase text-gray-600">
              <th className="p-3">Student ID</th>
              <th className="p-3">First Name</th>
              <th className="p-3">Second Name</th>
              <th className="p-3">Gender</th>
              <th className="p-3">Birth Date</th>
              <th className="p-3">Class</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Address</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr
                key={student.id}
                className="border-t hover:bg-gray-50 transition text-xs sm:text-sm"
              >
                <td className="p-3 font-medium">{student.studentId}</td>
                <td className="p-3">{student.firstName}</td>
                <td className="p-3">{student.secondName}</td>
                <td className="p-3">{student.gender}</td>
                <td className="p-3">{student.dob}</td>
                <td className="p-3">{student.className}</td>
                <td className="p-3">{student.phone}</td>
                <td className="p-3">{student.address}</td>
                <td className="p-3 flex flex-wrap sm:flex-nowrap justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => handleEdit(student)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full sm:w-auto"
                    onClick={() => handleDelete(student.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal (still static for now) */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[90%] sm:w-[400px] shadow-xl">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">
              Add / Edit Student
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
              Form content will go here.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
